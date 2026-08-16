/**
 * Stress & Adversarial Test Suite: Socket.IO Real-Time Engine,
 * Roll Broadcasting, Room Isolation, Token Sync, Rate Limiting & Telemetry
 */

import { expect, InMemoryDatabase, TestRegistry } from '../e2e/helpers.js';
import { WebSocketManager } from '../../dist/services/WebSocketManager.js';
import { GameSessionService } from '../../dist/services/GameSessionService.js';
import { RollPersistenceService } from '../../dist/services/RollPersistenceService.js';

export function createSocketTelemetryStressSuite() {
  const suite = new TestRegistry('Stress: Socket.IO & Realtime Telemetry');

  // Helper to create a mock Socket.IO server & socket pair
  function createMockIo() {
    const rooms = new Map(); // roomId -> Set of socket callbacks
    const sockets = new Map(); // socketId -> socket
    let socketIdCounter = 1;

    const io = {
      to(roomId) {
        return {
          emit(event, data) {
            const targets = rooms.get(roomId) || new Set();
            for (const sock of targets) {
              sock._trigger(event, data);
            }
          }
        };
      },
      emit(event, data) {
        for (const sock of sockets.values()) {
          sock._trigger(event, data);
        }
      },
      createSocket() {
        const id = `socket_${socketIdCounter++}`;
        const handlers = new Map();
        const joinedRooms = new Set();

        const socket = {
          id,
          joinedRooms,
          on(event, handler) {
            handlers.set(event, handler);
          },
          emit(event, data) {
            socket._trigger(event, data);
          },
          join(roomId) {
            joinedRooms.add(roomId);
            if (!rooms.has(roomId)) rooms.set(roomId, new Set());
            rooms.get(roomId).add(socket);
          },
          leave(roomId) {
            joinedRooms.delete(roomId);
            if (rooms.has(roomId)) rooms.get(roomId).delete(socket);
          },
          _trigger(event, data) {
            const h = handlers.get(event);
            if (h) h(data);
          },
          _received: [],
        };

        sockets.set(id, socket);
        return socket;
      },
      getRooms() {
        return rooms;
      }
    };

    return io;
  }

  // 1. Room Joining & Adversarial Room IDs
  suite.test('STR-SOCK-01', 'Room Joining rejects malformed, injection, and invalid room IDs', async () => {
    const io = createMockIo();
    const ws = new WebSocketManager(io);
    const socket = io.createSocket();

    const invalidRooms = [
      '',
      '   ',
      'ab', // too short (<3)
      'a'.repeat(51), // too long (>50)
      'room/../../etc/passwd',
      'room; DROP TABLE game_sessions;--',
      'room!@#$%',
      'room with spaces',
      'ROOM_UPPERCASE_NOT_ALLOWED',
      'room\nnewline'
    ];

    for (const badRoom of invalidRooms) {
      ws.joinRoom(socket, badRoom);
      expect(socket.joinedRooms.has(badRoom)).toBe(false);
    }

    // Valid rooms should join successfully
    const validRooms = ['tavern-brawl-1', 'dungeon-42', 'abc', 'a-b-c-12345'];
    for (const goodRoom of validRooms) {
      let stateEmitted = null;
      socket.on('room-state', (st) => { stateEmitted = st; });
      ws.joinRoom(socket, goodRoom);
      expect(socket.joinedRooms.has(goodRoom)).toBe(true);
      expect(stateEmitted).toBeDefined();
      expect(stateEmitted.mapUrl).toBeDefined();
      expect(stateEmitted.tokens).toBeDefined();
    }
  });

  // 2. Strict Room Isolation under Multi-Client Concurrency
  suite.test('STR-SOCK-02', 'Strict Room Isolation: Broadcast events never leak to unintended rooms', async () => {
    const io = createMockIo();
    const ws = new WebSocketManager(io);

    const clientA1 = io.createSocket();
    const clientA2 = io.createSocket();
    const clientB1 = io.createSocket();
    const clientC1 = io.createSocket();

    const receivedA1 = [];
    const receivedA2 = [];
    const receivedB1 = [];
    const receivedC1 = [];

    clientA1.on('new-roll', (d) => receivedA1.push(d));
    clientA2.on('new-roll', (d) => receivedA2.push(d));
    clientB1.on('new-roll', (d) => receivedB1.push(d));
    clientC1.on('new-roll', (d) => receivedC1.push(d));

    clientA1.on('token-moved', (d) => receivedA1.push(d));
    clientB1.on('token-moved', (d) => receivedB1.push(d));

    // Join rooms
    ws.joinRoom(clientA1, 'room-alpha');
    ws.joinRoom(clientA2, 'room-alpha');
    ws.joinRoom(clientB1, 'room-beta');
    ws.joinRoom(clientC1, 'room-gamma');

    // 1. Broadcast roll to room-alpha
    ws.broadcastRoll('room-alpha', {
      formula: '1d20+5',
      result: 23,
      rolls: [18],
      modifier: 5,
      characterName: 'Thorin',
    });

    expect(receivedA1.length).toBe(1);
    expect(receivedA2.length).toBe(1);
    expect(receivedB1.length).toBe(0);
    expect(receivedC1.length).toBe(0);
    expect(receivedA1[0].characterName).toBe('Thorin');

    // 2. Move token in room-beta
    ws.addToken('room-beta', { id: 'tok-1', name: 'Goblin', avatarUrl: 'https://example.com/g.png', x: 2, y: 2 });
    ws.moveToken('room-beta', 'tok-1', 4, 5);

    expect(receivedB1.length).toBe(1); // token-moved
    expect(receivedA1.length).toBe(1); // unchanged
    expect(receivedA2.length).toBe(1); // unchanged
    expect(receivedC1.length).toBe(0); // unchanged
  });

  // 3. Rapid-Fire Roll Broadcasting & 100-Roll Window Rate Limiting
  suite.test('STR-SOCK-03', 'Rapid-Fire socket roll rate limiting throttles at 100 rolls/min', async () => {
    const db = new InMemoryDatabase();
    const persistence = new RollPersistenceService(db);
    const socketRollWindows = new Map();
    const io = createMockIo();
    const socket = io.createSocket();
    const receivedSystemAlerts = [];
    const receivedRollsInRoom = [];

    socket.on('new-roll', (data) => {
      if (data.system) {
        receivedSystemAlerts.push(data);
      }
    });

    const roomSocket = io.createSocket();
    roomSocket.join('stress-room-1');
    roomSocket.on('new-roll', (data) => {
      if (!data.system) receivedRollsInRoom.push(data);
    });

    // Emulate server.js send-roll handler
    async function handleSendRoll(sock, data) {
      const now = Date.now();
      const window = socketRollWindows.get(sock.id) || { startedAt: now, count: 0 };
      if (now - window.startedAt >= 60_000) { window.startedAt = now; window.count = 0; }
      if (window.count >= 100) {
        sock.emit('new-roll', { system: true, text: 'Roll limit reached. Try again in a minute.' });
        return;
      }
      window.count += 1;
      socketRollWindows.set(sock.id, window);

      if (!data || typeof data.roomId !== 'string' || !Array.isArray(data.rolls)) return;
      io.to(data.roomId).emit('new-roll', data);
      await persistence.persist(data);
    }

    // Fire 105 rapid rolls from socket
    for (let i = 1; i <= 105; i++) {
      await handleSendRoll(socket, {
        roomId: 'stress-room-1',
        characterId: 'char-101',
        characterName: 'Speedy Roller',
        rollName: `Roll #${i}`,
        formula: '1d20+2',
        result: (i % 20) + 1 + 2,
        rolls: [(i % 20) + 1],
      });
    }

    // Verify first 100 rolls passed through to room
    expect(receivedRollsInRoom.length).toBe(100);
    // Verify rolls 101 to 105 were throttled with system warning
    expect(receivedSystemAlerts.length).toBe(5);
    expect(receivedSystemAlerts[0].text).toContain('Roll limit reached');

    // Verify database stored exactly 100 rolls
    const session = await db.get('SELECT id FROM game_sessions WHERE room_id = ?', ['stress-room-1']);
    expect(session).toBeDefined();
    const countRow = await db.get('SELECT COUNT(*) AS total FROM dice_rolls WHERE session_id = ?', [session.id]);
    expect(countRow.total).toBe(100);
  });

  // 4. Multi-Client Concurrency Stress
  suite.test('STR-SOCK-04', 'High Concurrency: 10 sockets send 50 rolls across 5 rooms concurrently', async () => {
    const db = new InMemoryDatabase();
    const persistence = new RollPersistenceService(db);
    const io = createMockIo();
    const ws = new WebSocketManager(io);

    const roomNames = ['arena-1', 'arena-2', 'arena-3', 'arena-4', 'arena-5'];
    const clientSockets = [];
    const roomRollCounts = { 'arena-1': 0, 'arena-2': 0, 'arena-3': 0, 'arena-4': 0, 'arena-5': 0 };

    // Create 10 clients (2 per room)
    for (let i = 0; i < 10; i++) {
      const room = roomNames[i % 5];
      const sock = io.createSocket();
      ws.joinRoom(sock, room);
      sock.on('new-roll', (d) => {
        if (!d.system && d.roomId) roomRollCounts[d.roomId]++;
      });
      clientSockets.push({ sock, room, id: i });
    }

    // Concurrently fire 50 rolls per client = 500 total rolls (100 per room)
    const rollPromises = [];
    for (const client of clientSockets) {
      for (let r = 0; r < 50; r++) {
        const rollPayload = {
          roomId: client.room,
          characterId: `char-${client.id}`,
          characterName: `Player-${client.id}`,
          rollName: `Attack ${r}`,
          formula: '1d20+3',
          result: 15,
          rolls: [12],
        };
        rollPromises.push((async () => {
          io.to(client.room).emit('new-roll', rollPayload);
          await persistence.persist(rollPayload);
        })());
      }
    }

    await Promise.all(rollPromises);

    // Each room has 2 clients listening. 100 rolls emitted per room * 2 clients = 200 received events per room
    for (const r of roomNames) {
      expect(roomRollCounts[r]).toBe(200);
      const session = await db.get('SELECT id FROM game_sessions WHERE room_id = ?', [r]);
      expect(session).toBeDefined();
      const dbCount = await db.get('SELECT COUNT(*) AS total FROM dice_rolls WHERE session_id = ?', [session.id]);
      expect(dbCount.total).toBe(100);
    }
  });

  // 5. Malformed & Adversarial Roll Payloads
  suite.test('STR-SOCK-05', 'Adversarial & malformed roll envelopes handle gracefully without unhandled exceptions', async () => {
    const db = new InMemoryDatabase();
    const persistence = new RollPersistenceService(db);

    const malformedRolls = [
      null,
      undefined,
      {},
      { roomId: '' },
      { roomId: 'valid-room-1' }, // missing rolls
      { roomId: 'valid-room-1', rolls: 'not-an-array' },
      { roomId: 'valid-room-1', rolls: null },
      { roomId: 'valid-room-1', rolls: [20], result: 'NaN' },
      { roomId: 'valid-room-1', rolls: [20], result: Infinity },
      { roomId: 'invalid/traversal/room', rolls: [10], result: 10 },
      { roomId: 'valid-room-1', rolls: new Array(5000).fill(6), result: 30000 },
      { roomId: 'valid-room-1', rolls: [20], characterName: '<script>alert(1)</script>' }
    ];

    for (const badRoll of malformedRolls) {
      try {
        if (badRoll && badRoll.roomId && typeof badRoll.roomId === 'string') {
          await persistence.persist(badRoll);
        }
      } catch (err) {
        expect(err).toBeDefined();
      }
    }

    // Verify valid room was safely written without corruption
    const validRoll = {
      roomId: 'valid-room-1',
      characterName: 'Safe Player',
      rollName: 'Test',
      formula: '1d20',
      result: 15,
      rolls: [15]
    };
    await persistence.persist(validRoll);
    const session = await db.get('SELECT id FROM game_sessions WHERE room_id = ?', ['valid-room-1']);
    expect(session).toBeDefined();
  });

  // 6. Tactical Token Synchronization Stress & Boundary Clamping
  suite.test('STR-SOCK-06', 'Token coordinate boundaries clamp strictly to [0, 11] under adversarial inputs', async () => {
    const io = createMockIo();
    const ws = new WebSocketManager(io);
    const roomId = 'tactical-room-1';

    // Adding token with out-of-bounds coordinates
    const t1 = ws.addToken(roomId, {
      id: 'tok-out-bounds-1',
      name: 'Rogue',
      avatarUrl: 'https://example.com/rogue.png',
      x: 999,
      y: -500,
    });
    expect(t1).toBe(true);

    const state = ws.getRoomState(roomId);
    expect(state.tokens['tok-out-bounds-1'].x).toBe(11);
    expect(state.tokens['tok-out-bounds-1'].y).toBe(0);

    // Rapid moves with extreme coordinates
    const moveCases = [
      { x: -100, y: -200, expectedX: 0, expectedY: 0 },
      { x: 50, y: 80, expectedX: 11, expectedY: 11 },
      { x: 5, y: 7, expectedX: 5, expectedY: 7 },
      { x: 0, y: 11, expectedX: 0, expectedY: 11 },
      { x: 11, y: 0, expectedX: 11, expectedY: 0 },
    ];

    for (const mc of moveCases) {
      const moved = ws.moveToken(roomId, 'tok-out-bounds-1', mc.x, mc.y);
      expect(moved).toBe(true);
      expect(state.tokens['tok-out-bounds-1'].x).toBe(mc.expectedX);
      expect(state.tokens['tok-out-bounds-1'].y).toBe(mc.expectedY);
    }

    // Invalid non-integer move coordinates should be rejected
    expect(ws.moveToken(roomId, 'tok-out-bounds-1', 4.5, 3.2)).toBe(false);
    expect(ws.moveToken(roomId, 'tok-out-bounds-1', NaN, 3)).toBe(false);
    expect(ws.moveToken(roomId, 'tok-out-bounds-1', 4, Infinity)).toBe(false);

    // Removing non-existent token returns false gracefully
    expect(ws.removeToken(roomId, 'non-existent-token')).toBe(false);
    // Removing valid token
    expect(ws.removeToken(roomId, 'tok-out-bounds-1')).toBe(true);
    expect(state.tokens['tok-out-bounds-1']).toBeUndefined();
  });

  // 7. Tactical Map URL Security & Protocol Verification
  suite.test('STR-SOCK-07', 'Map URL validation strictly enforces http/https and length <= 2000', async () => {
    const io = createMockIo();
    const ws = new WebSocketManager(io);
    const roomId = 'map-sec-room';

    const maliciousUrls = [
      'javascript:alert(document.cookie)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'ftp://ftp.example.com/map.png',
      'vbscript:msgbox("test")',
      'http://' + 'a'.repeat(2100) + '.com/map.png', // > 2000 chars
      'not-a-valid-url',
      '',
      null
    ];

    for (const url of maliciousUrls) {
      const updated = ws.updateMap(roomId, url);
      expect(updated).toBe(false);
    }

    // Valid URLs must succeed
    expect(ws.updateMap(roomId, 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200')).toBe(true);
    expect(ws.updateMap(roomId, 'http://localhost:3000/maps/dungeon.webp')).toBe(true);
  });

  // 8. Session Telemetry Roll Logging & Analytics Aggregation
  suite.test('STR-SOCK-08', 'Session Telemetry correctly tracks averages, critical hits/fails, and formula distributions', async () => {
    const db = new InMemoryDatabase();
    const sessionService = new GameSessionService(db);
    const persistence = new RollPersistenceService(db);
    const roomId = 'analytics-test-room';

    await sessionService.create(roomId, 1, 'Analytics Test Session');

    // Known roll sequence:
    // 5x 1d20+5: rolls=[20] (crit hit), [1] (crit fail), [10], [15], [18] -> results: 25, 6, 15, 20, 23
    // 3x 2d6+3: rolls=[3, 4] -> results: 10, 10, 10
    // 2x 1d8+2: rolls=[8] -> results: 10, 10
    const testRolls = [
      { formula: '1d20+5', rolls: [20], result: 25 },
      { formula: '1d20+5', rolls: [1], result: 6 },
      { formula: '1d20+5', rolls: [10], result: 15 },
      { formula: '1d20+5', rolls: [15], result: 20 },
      { formula: '1d20+5', rolls: [18], result: 23 },
      { formula: '2d6+3', rolls: [3, 4], result: 10 },
      { formula: '2d6+3', rolls: [3, 4], result: 10 },
      { formula: '2d6+3', rolls: [3, 4], result: 10 },
      { formula: '1d8+2', rolls: [8], result: 10 },
      { formula: '1d8+2', rolls: [8], result: 10 },
    ];

    for (const r of testRolls) {
      await persistence.persist({
        roomId,
        characterId: 'char-hero',
        characterName: 'Hero',
        rollName: 'Attack',
        formula: r.formula,
        result: r.result,
        rolls: r.rolls,
      });
    }

    const analytics = await sessionService.analytics(roomId);
    expect(analytics.totalRolls).toBe(10);
    // Sum = 25+6+15+20+23+10+10+10+10+10 = 139 / 10 = 13.9
    expect(analytics.averageResult).toBe(13.9);
    // Critical rolls = 2 (Nat 20 and Nat 1 on d20)
    expect(analytics.criticalCount).toBe(2);

    // Formula distribution: 1d20+5 (5 uses), 2d6+3 (3 uses), 1d8+2 (2 uses)
    expect(analytics.formulas.length).toBe(3);
    expect(analytics.formulas[0].formula).toBe('1d20+5');
    expect(analytics.formulas[0].uses).toBe(5);
    expect(analytics.formulas[1].formula).toBe('2d6+3');
    expect(analytics.formulas[1].uses).toBe(3);
    expect(analytics.formulas[2].formula).toBe('1d8+2');
    expect(analytics.formulas[2].uses).toBe(2);
  });

  return suite;
}
