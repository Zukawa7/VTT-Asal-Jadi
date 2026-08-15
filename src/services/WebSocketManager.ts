import type { Server, Socket } from 'socket.io';
import type { SocketClientToServerEvents, SocketServerToClientEvents } from '../types/events.js';
import type { RoomState, TokenState } from '../types/api.js';
import type { DiceRoll } from './DiceRollerService.js';

export type TypedIo = Server<SocketClientToServerEvents, SocketServerToClientEvents>;
export type TypedSocket = Socket<SocketClientToServerEvents, SocketServerToClientEvents>;

const DEFAULT_MAP = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200';

export class WebSocketManager {
  private readonly rooms = new Map<string, RoomState>();

  constructor(private readonly io: TypedIo) {}

  private state(roomId: string): RoomState {
    let state = this.rooms.get(roomId);
    if (!state) {
      state = { mapUrl: DEFAULT_MAP, tokens: {} };
      this.rooms.set(roomId, state);
    }
    return state;
  }

  joinRoom(socket: TypedSocket, roomId: string): void {
    socket.join(roomId);
    socket.emit('room-state', this.state(roomId));
  }

  updateMap(roomId: string, mapUrl: string): void {
    if (!mapUrl || mapUrl.length > 2000) return;
    this.state(roomId).mapUrl = mapUrl;
    this.io.to(roomId).emit('map-updated', mapUrl);
  }

  addToken(roomId: string, token: TokenState): void {
    this.state(roomId).tokens[token.id] = token;
    this.io.to(roomId).emit('token-added', token);
  }

  moveToken(roomId: string, tokenId: string, x: number, y: number): void {
    const token = this.state(roomId).tokens[tokenId];
    if (!token || !Number.isInteger(x) || !Number.isInteger(y)) return;
    token.x = Math.max(0, Math.min(11, x));
    token.y = Math.max(0, Math.min(11, y));
    this.io.to(roomId).emit('token-moved', { tokenId, x: token.x, y: token.y });
  }

  removeToken(roomId: string, tokenId: string): void {
    if (!this.state(roomId).tokens[tokenId]) return;
    delete this.state(roomId).tokens[tokenId];
    this.io.to(roomId).emit('token-removed', tokenId);
  }

  broadcastRoll(roomId: string, roll: DiceRoll & { characterName?: string }): void {
    this.io.to(roomId).emit('new-roll', {
      roomId,
      characterName: roll.characterName ?? 'Adventurer',
      rollName: 'Dice Roll',
      formula: roll.formula,
      result: roll.result,
      rolls: roll.rolls,
      modifier: roll.modifier,
    });
  }

  broadcastCharacterUpdate(roomId: string, character: unknown): void {
    this.io.to(roomId).emit('token-added', character as never);
  }
}
