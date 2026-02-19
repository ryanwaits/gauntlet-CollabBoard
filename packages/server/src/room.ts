import WebSocket from "ws";
import type { StorageDocument } from "@waits/openblocks-storage";
import type { Connection, PresenceUser } from "./types.js";

export class Room {
  readonly id: string;
  readonly connections: Map<string, Connection> = new Map();
  private _storage: StorageDocument | null = null;
  private _storageInitialized = false;
  storageInitPromise: Promise<void> | null = null;
  private _presenceCache: string | null = null;

  constructor(id: string) {
    this.id = id;
  }

  get storageInitialized(): boolean {
    return this._storageInitialized;
  }

  initStorage(doc: StorageDocument): void {
    this._storage = doc;
    this._storageInitialized = true;
  }

  getStorageDocument(): StorageDocument | null {
    return this._storage;
  }

  addConnection(id: string, ws: WebSocket, user: PresenceUser): void {
    this.connections.set(id, { ws, user });
    this._presenceCache = null;
  }

  removeConnection(id: string): PresenceUser | undefined {
    const conn = this.connections.get(id);
    this.connections.delete(id);
    this._presenceCache = null;
    return conn?.user;
  }

  getPresenceMessage(): string {
    if (!this._presenceCache) {
      this._presenceCache = JSON.stringify({
        type: "presence",
        users: this.getUsers(),
      });
    }
    return this._presenceCache;
  }

  broadcast(data: string, excludeIds?: string[]): void {
    const excluded = excludeIds ? new Set(excludeIds) : undefined;
    for (const [id, conn] of this.connections) {
      if (excluded?.has(id)) continue;
      if (conn.ws.readyState === WebSocket.OPEN) {
        try {
          conn.ws.send(data);
        } catch {}
      }
    }
  }

  send(connectionId: string, data: string): void {
    const conn = this.connections.get(connectionId);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      try {
        conn.ws.send(data);
      } catch {}
    }
  }

  getUsers(): PresenceUser[] {
    return Array.from(this.connections.values()).map((c) => c.user);
  }

  get size(): number {
    return this.connections.size;
  }
}
