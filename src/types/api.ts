import type { RollEvent } from './events.js';

export interface ApiError {
  error: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface RoomState {
  mapUrl: string;
  tokens: Record<string, TokenState>;
}

export interface TokenState {
  id: string;
  name: string;
  avatarUrl: string;
  x: number;
  y: number;
}

export type { RollEvent };
