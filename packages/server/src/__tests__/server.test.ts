import { describe, it, expect, afterEach } from "bun:test";
import { OpenBlocksServer } from "../server";

describe("OpenBlocksServer", () => {
  let server: OpenBlocksServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  it("starts on a random port and stops cleanly", async () => {
    server = new OpenBlocksServer();
    await server.start(0);
    expect(server.port).toBeGreaterThan(0);
    await server.stop();
    server = null;
  });

  it("returns -1 port before starting", () => {
    server = new OpenBlocksServer();
    expect(server.port).toBe(-1);
  });

  it("broadcastToRoom returns false for unknown room", async () => {
    server = new OpenBlocksServer();
    await server.start(0);
    expect(server.broadcastToRoom("nonexistent", "hi")).toBe(false);
  });
});
