// --- Presence & Cursor ---

export interface PresenceUser {
  userId: string;
  displayName: string;
  color: string;
  connectedAt: number;
}

export interface CursorData {
  userId: string;
  displayName: string;
  color: string;
  x: number;
  y: number;
  lastUpdate: number;
  viewportPos?: { x: number; y: number };
  viewportScale?: number;
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

// --- Wire Protocol Messages ---

export interface PresenceMessage {
  type: "presence";
  users: PresenceUser[];
}

export interface CursorUpdateMessage {
  type: "cursor:update";
  cursor: CursorData;
}

export interface ClientCursorMessage {
  type: "cursor:update";
  x: number;
  y: number;
  viewportPos?: { x: number; y: number };
  viewportScale?: number;
}
