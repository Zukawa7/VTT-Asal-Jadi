export interface RollEvent {
  roomId: string;
  characterName: string;
  characterAvatar?: string;
  rollName: string;
  formula: string;
  result: number;
  rolls: number[];
  modifier?: number;
}

export interface SocketClientToServerEvents {
  'join-room': (roomId: string) => void;
  'send-roll': (event: RollEvent) => void;
  'update-map': (event: { roomId: string; mapUrl: string }) => void;
  'add-token': (event: {
    roomId: string;
    token: { id: string; name: string; avatarUrl: string; x: number; y: number };
  }) => void;
  'move-token': (event: { roomId: string; tokenId: string; x: number; y: number }) => void;
  'remove-token': (event: { roomId: string; tokenId: string }) => void;
}

export interface SocketServerToClientEvents {
  'new-roll': (event: RollEvent) => void;
  'room-state': (state: { mapUrl: string; tokens: Record<string, unknown> }) => void;
  'map-updated': (mapUrl: string) => void;
  'token-added': (token: unknown) => void;
  'token-moved': (event: { tokenId: string; x: number; y: number }) => void;
  'token-removed': (tokenId: string) => void;
  'character-updated': (character: unknown) => void;
}
