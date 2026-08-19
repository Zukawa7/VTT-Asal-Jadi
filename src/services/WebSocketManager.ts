import type { Server, Socket } from 'socket.io';
import type { SocketClientToServerEvents, SocketServerToClientEvents } from '../types/events.js';
import type { RoomState, TokenState } from '../types/api.js';
import type { DiceRoll } from './DiceRollerService.js';
import { validateRoomId } from '../utils/validators.js';

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
    if (!validateRoomId(roomId)) return;
    socket.join(roomId);
    socket.emit('room-state', this.state(roomId));
  }

  getRoomState(roomId: string): RoomState {
    return this.state(roomId);
  }

  setMapUrl(roomId: string, mapUrl: string): boolean {
    return this.updateMap(roomId, mapUrl);
  }

  updateMap(roomId: string, mapUrl: string): boolean {
    if (!validateRoomId(roomId) || !mapUrl || mapUrl.length > 2000) return false;
    try {
      const url = new URL(mapUrl);
      if (!['http:', 'https:'].includes(url.protocol)) return false;
    } catch {
      return false;
    }
    this.state(roomId).mapUrl = mapUrl;
    this.io.to(roomId).emit('map-updated', mapUrl);
    return true;
  }

  addToken(roomId: string, token: TokenState): boolean {
    if (!validateRoomId(roomId) || !token?.id || !token.name || !token.avatarUrl) return false;
    this.state(roomId).tokens[token.id] = {
      ...token,
      x: Math.max(0, Math.min(11, Number(token.x) || 0)),
      y: Math.max(0, Math.min(11, Number(token.y) || 0)),
    };
    this.io.to(roomId).emit('token-added', this.state(roomId).tokens[token.id]);
    return true;
  }

  moveToken(roomId: string, tokenId: string, x: number, y: number): boolean {
    if (!validateRoomId(roomId) || !tokenId) return false;
    const token = this.state(roomId).tokens[tokenId];
    if (!token || !Number.isInteger(x) || !Number.isInteger(y)) return false;
    token.x = Math.max(0, Math.min(11, x));
    token.y = Math.max(0, Math.min(11, y));
    this.io.to(roomId).emit('token-moved', { tokenId, x: token.x, y: token.y });
    return true;
  }

  removeToken(roomId: string, tokenId: string): boolean {
    if (!validateRoomId(roomId) || !tokenId || !this.state(roomId).tokens[tokenId]) return false;
    delete this.state(roomId).tokens[tokenId];
    this.io.to(roomId).emit('token-removed', tokenId);
    return true;
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
    if (!validateRoomId(roomId)) return;
    this.io.to(roomId).emit('character-updated', character);
  }
}
