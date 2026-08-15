import type { Server } from 'socket.io';
import type { SocketClientToServerEvents, SocketServerToClientEvents } from '../types/events.js';
import type { DiceRoll } from './DiceRollerService.js';

export type TypedIo = Server<SocketClientToServerEvents, SocketServerToClientEvents>;

export class WebSocketManager {
  constructor(private readonly io: TypedIo) {}

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
    this.io.to(roomId).emit('token-added', character);
  }
}
