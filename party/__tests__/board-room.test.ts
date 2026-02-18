import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import BoardRoom from "../board-room";
import { makeObj, makeLine, makeFrame } from "../../tests/helpers/factory";
import type { BoardObject, Frame } from "../../src/types/board";
import type { ClientMessage, ServerMessage } from "../../src/types/messages";
import { frameOriginX, FRAME_ORIGIN_Y, BOARD_WIDTH, BOARD_HEIGHT } from "../../src/lib/geometry/frames";

// --- Mock helpers ---

function mockRoom(overrides?: Partial<{ id: string; env: Record<string, string> }>) {
  return {
    id: overrides?.id ?? "test-board",
    env: {
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      AI_SECRET: "test-secret",
      ...overrides?.env,
    },
    broadcast: mock(),
  } as any;
}

function mockConnection(id = "conn-1", userId = "user-1", displayName = "Alice") {
  return {
    id,
    send: mock(),
    _userId: userId,
    _displayName: displayName,
  } as any;
}

function mockContext(userId = "user-1", displayName = "Alice") {
  return {
    request: {
      url: `http://localhost:1999/parties/main/test-board?userId=${userId}&displayName=${encodeURIComponent(displayName)}`,
    },
  } as any;
}

function sent(conn: any): ServerMessage[] {
  return conn.send.mock.calls.map((c: any) => JSON.parse(c[0]));
}

function broadcasted(room: any): { msg: ServerMessage; exclude?: string[] }[] {
  return room.broadcast.mock.calls.map((c: any) => ({
    msg: JSON.parse(c[0]),
    exclude: c[1],
  }));
}

// --- Tests ---

describe("BoardRoom", () => {
  let server: BoardRoom;
  let room: any;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    room = mockRoom();
    server = new BoardRoom(room);
    // Seed default frame so most tests skip onStart
    server.frames = [makeFrame({ id: "frame-0", index: 0, label: "Frame 1" })];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // --- onStart ---

  describe("onStart", () => {
    test("hydrates from Supabase when configured", async () => {
      const obj = makeObj({ id: "db-obj", board_id: "test-board" });
      const frame = makeFrame({ id: "db-frame", index: 0 });

      room.env.SUPABASE_URL = "https://fake.supabase.co";
      room.env.SUPABASE_SERVICE_ROLE_KEY = "fake-key";
      server = new BoardRoom(room);

      globalThis.fetch = mock((url: string) => {
        if (url.includes("board_objects")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([obj]) });
        }
        if (url.includes("boards")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ frames: [frame] }]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }) as any;

      await server.onStart();

      expect(server.objects.size).toBe(1);
      expect(server.objects.get("db-obj")).toEqual(obj);
      expect(server.frames).toEqual([frame]);
    });

    test("creates default frame when DB returns empty", async () => {
      room.env.SUPABASE_URL = "https://fake.supabase.co";
      room.env.SUPABASE_SERVICE_ROLE_KEY = "fake-key";
      server = new BoardRoom(room);

      globalThis.fetch = mock(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      ) as any;

      await server.onStart();

      expect(server.frames.length).toBe(1);
      expect(server.frames[0].label).toBe("Frame 1");
      expect(server.frames[0].index).toBe(0);
    });

    test("creates default frame when no Supabase configured", async () => {
      server = new BoardRoom(room); // env has empty strings
      await server.onStart();

      expect(server.frames.length).toBe(1);
      expect(server.frames[0].index).toBe(0);
    });
  });

  // --- onConnect ---

  describe("onConnect", () => {
    test("sends sync and frame:sync to new connection", () => {
      const obj = makeObj({ id: "sync-obj" });
      server.objects.set(obj.id, obj);

      const conn = mockConnection();
      server.onConnect(conn, mockContext());

      const msgs = sent(conn);
      expect(msgs.length).toBe(2);
      expect(msgs[0].type).toBe("sync");
      expect((msgs[0] as any).objects).toEqual([obj]);
      expect(msgs[1].type).toBe("frame:sync");
      expect((msgs[1] as any).frames).toEqual(server.frames);
    });

    test("broadcasts presence after connect", () => {
      const conn = mockConnection();
      server.onConnect(conn, mockContext());

      const bcast = broadcasted(room);
      const presenceMsg = bcast.find((b) => b.msg.type === "presence");
      expect(presenceMsg).toBeDefined();
      expect((presenceMsg!.msg as any).users.length).toBe(1);
    });
  });

  // --- onMessage: cursor:update ---

  describe("onMessage — cursor:update", () => {
    test("broadcasts cursor with sender exclusion", async () => {
      const conn = mockConnection("c1", "u1", "Alice");
      server.onConnect(conn, mockContext("u1", "Alice"));
      room.broadcast.mockClear();

      const msg: ClientMessage = { type: "cursor:update", x: 50, y: 100 };
      await server.onMessage(JSON.stringify(msg), conn);

      const bcast = broadcasted(room);
      expect(bcast.length).toBe(1);
      expect(bcast[0].msg.type).toBe("cursor:update");
      expect(bcast[0].exclude).toEqual(["c1"]);
    });
  });

  // --- onMessage: object:create ---

  describe("onMessage — object:create", () => {
    test("adds object, broadcasts to ALL, persists", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({ ok: true, text: () => Promise.resolve("") })
      ) as any;

      const conn = mockConnection("c1", "u1");
      server.onConnect(conn, mockContext("u1"));
      room.broadcast.mockClear();

      const obj = makeObj({ id: "new-obj" });
      const msg: ClientMessage = { type: "object:create", object: obj };
      await server.onMessage(JSON.stringify(msg), conn);

      expect(server.objects.get("new-obj")).toEqual(obj);

      const bcast = broadcasted(room);
      const createMsg = bcast.find((b) => b.msg.type === "object:create");
      expect(createMsg).toBeDefined();
      // object:create broadcasts to ALL (no sender exclusion)
      expect(createMsg!.exclude).toBeUndefined();
    });
  });

  // --- onMessage: object:update ---

  describe("onMessage — object:update", () => {
    test("LWW: newer updated_at accepted", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({ ok: true, text: () => Promise.resolve("") })
      ) as any;

      const conn = mockConnection("c1", "u1");
      server.onConnect(conn, mockContext("u1"));

      const obj = makeObj({ id: "upd", updated_at: "2024-01-01T00:00:00Z" });
      server.objects.set(obj.id, obj);
      room.broadcast.mockClear();

      const updated = { ...obj, text: "new", updated_at: "2024-01-02T00:00:00Z" };
      await server.onMessage(
        JSON.stringify({ type: "object:update", object: updated } as ClientMessage),
        conn
      );

      expect(server.objects.get("upd")!.text).toBe("new");
    });

    test("LWW: older updated_at rejected", async () => {
      const conn = mockConnection("c1", "u1");
      server.onConnect(conn, mockContext("u1"));

      const obj = makeObj({ id: "upd2", updated_at: "2024-01-02T00:00:00Z" });
      server.objects.set(obj.id, obj);
      room.broadcast.mockClear();

      const stale = { ...obj, text: "stale", updated_at: "2024-01-01T00:00:00Z" };
      await server.onMessage(
        JSON.stringify({ type: "object:update", object: stale } as ClientMessage),
        conn
      );

      expect(server.objects.get("upd2")!.text).toBe("");
      expect(broadcasted(room).length).toBe(0);
    });

    test("excludes sender from broadcast", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({ ok: true, text: () => Promise.resolve("") })
      ) as any;

      const conn = mockConnection("c1", "u1");
      server.onConnect(conn, mockContext("u1"));

      const obj = makeObj({ id: "ex", updated_at: "2024-01-01T00:00:00Z" });
      server.objects.set(obj.id, obj);
      room.broadcast.mockClear();

      const updated = { ...obj, updated_at: "2024-01-02T00:00:00Z" };
      await server.onMessage(
        JSON.stringify({ type: "object:update", object: updated } as ClientMessage),
        conn
      );

      const bcast = broadcasted(room);
      expect(bcast[0].exclude).toEqual(["c1"]);
    });

    test("ephemeral=true skips fetch", async () => {
      const fetchMock = mock(() =>
        Promise.resolve({ ok: true, text: () => Promise.resolve("") })
      );
      globalThis.fetch = fetchMock as any;

      const conn = mockConnection("c1", "u1");
      server.onConnect(conn, mockContext("u1"));

      const obj = makeObj({ id: "eph", updated_at: "2024-01-01T00:00:00Z" });
      server.objects.set(obj.id, obj);

      // Clear any fetch calls from onConnect
      fetchMock.mockClear();

      const updated = { ...obj, updated_at: "2024-01-02T00:00:00Z" };
      await server.onMessage(
        JSON.stringify({ type: "object:update", object: updated, ephemeral: true } as ClientMessage),
        conn
      );

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // --- onMessage: object:delete ---

  describe("onMessage — object:delete", () => {
    test("removes object, broadcasts to all, persists", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({ ok: true, text: () => Promise.resolve("") })
      ) as any;

      const conn = mockConnection("c1", "u1");
      server.onConnect(conn, mockContext("u1"));

      const obj = makeObj({ id: "del-me" });
      server.objects.set(obj.id, obj);
      room.broadcast.mockClear();

      await server.onMessage(
        JSON.stringify({ type: "object:delete", objectId: "del-me" } as ClientMessage),
        conn
      );

      expect(server.objects.has("del-me")).toBe(false);

      const bcast = broadcasted(room);
      const delMsg = bcast.find((b) => b.msg.type === "object:delete");
      expect(delMsg).toBeDefined();
      expect(delMsg!.exclude).toBeUndefined(); // broadcasts to ALL
    });
  });

  // --- onMessage: frame:create ---

  describe("onMessage — frame:create", () => {
    test("appends frame, sorts, broadcasts with sender exclusion", async () => {
      const conn = mockConnection("c1", "u1");
      server.onConnect(conn, mockContext("u1"));
      room.broadcast.mockClear();

      const frame = makeFrame({ id: "f-new", index: 5, label: "Frame 5" });
      await server.onMessage(
        JSON.stringify({ type: "frame:create", frame } as ClientMessage),
        conn
      );

      expect(server.frames.find((f) => f.id === "f-new")).toBeDefined();
      // Sorted: index 0 before index 5
      expect(server.frames[0].index).toBeLessThanOrEqual(server.frames[server.frames.length - 1].index);

      const bcast = broadcasted(room);
      const frameMsg = bcast.find((b) => b.msg.type === "frame:create");
      expect(frameMsg!.exclude).toEqual(["c1"]);
    });
  });

  // --- onMessage: frame:delete ---

  describe("onMessage — frame:delete", () => {
    test("only 1 frame → no-op", async () => {
      const conn = mockConnection("c1", "u1");
      server.onConnect(conn, mockContext("u1"));
      room.broadcast.mockClear();

      const frameId = server.frames[0].id;
      await server.onMessage(
        JSON.stringify({ type: "frame:delete", frameId } as ClientMessage),
        conn
      );

      // Frame should still exist
      expect(server.frames.length).toBe(1);
      expect(broadcasted(room).length).toBe(0);
    });

    test("cascade: deletes objects in frame bounds + connected lines", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({ ok: true, text: () => Promise.resolve("") })
      ) as any;

      // Two frames
      const frame0 = makeFrame({ id: "f0", index: 0 });
      const frame1 = makeFrame({ id: "f1", index: 1 });
      server.frames = [frame0, frame1];

      // Object in frame 0 bounds
      const fx = frameOriginX(0);
      const fy = FRAME_ORIGIN_Y;
      const objInFrame = makeObj({
        id: "in-frame",
        x: fx + 100,
        y: fy + 100,
        width: 100,
        height: 100,
      });

      // Object outside frame 0 (in frame 1)
      const fx1 = frameOriginX(1);
      const objOutside = makeObj({
        id: "outside",
        x: fx1 + 100,
        y: fy + 100,
        width: 100,
        height: 100,
      });

      // Line connected to objInFrame
      const connectedLine = makeLine({
        id: "connected-line",
        start_object_id: "in-frame",
        end_object_id: null,
        x: fx,
        y: fy,
      });

      server.objects.set(objInFrame.id, objInFrame);
      server.objects.set(objOutside.id, objOutside);
      server.objects.set(connectedLine.id, connectedLine);

      const conn = mockConnection("c1", "u1");
      server.onConnect(conn, mockContext("u1"));
      room.broadcast.mockClear();

      await server.onMessage(
        JSON.stringify({ type: "frame:delete", frameId: "f0" } as ClientMessage),
        conn
      );

      // Frame removed
      expect(server.frames.find((f) => f.id === "f0")).toBeUndefined();
      // Object in frame deleted
      expect(server.objects.has("in-frame")).toBe(false);
      // Connected line deleted
      expect(server.objects.has("connected-line")).toBe(false);
      // Object outside frame kept
      expect(server.objects.has("outside")).toBe(true);

      // Broadcast includes deletedObjectIds
      const bcast = broadcasted(room);
      const deleteMsg = bcast.find((b) => b.msg.type === "frame:delete");
      expect(deleteMsg).toBeDefined();
      const deletedIds: string[] = (deleteMsg!.msg as any).deletedObjectIds;
      expect(deletedIds).toContain("in-frame");
      expect(deletedIds).toContain("connected-line");
      expect(deletedIds).not.toContain("outside");
    });

    test("cascade: unconnected lines within frame bounds are deleted", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({ ok: true, text: () => Promise.resolve("") })
      ) as any;

      const frame0 = makeFrame({ id: "f0", index: 0 });
      const frame1 = makeFrame({ id: "f1", index: 1 });
      server.frames = [frame0, frame1];

      const fx = frameOriginX(0);
      const fy = FRAME_ORIGIN_Y;

      // Unconnected line with midpoint inside frame 0
      const freeLine = makeLine({
        id: "free-line",
        start_object_id: null,
        end_object_id: null,
        points: [
          { x: fx + 100, y: fy + 100 },
          { x: fx + 200, y: fy + 200 },
        ],
      });
      server.objects.set(freeLine.id, freeLine);

      const conn = mockConnection("c1", "u1");
      server.onConnect(conn, mockContext("u1"));
      room.broadcast.mockClear();

      await server.onMessage(
        JSON.stringify({ type: "frame:delete", frameId: "f0" } as ClientMessage),
        conn
      );

      expect(server.objects.has("free-line")).toBe(false);
    });
  });

  // --- onClose ---

  describe("onClose", () => {
    test("removes connection, broadcasts updated presence", () => {
      const conn = mockConnection("c1", "u1");
      server.onConnect(conn, mockContext("u1"));
      room.broadcast.mockClear();

      server.onClose(conn);

      const bcast = broadcasted(room);
      const presenceMsg = bcast.find((b) => b.msg.type === "presence");
      expect(presenceMsg).toBeDefined();
      expect((presenceMsg!.msg as any).users.length).toBe(0);
    });
  });

  // --- onRequest ---

  describe("onRequest", () => {
    test("GET returns objects and frames", async () => {
      const obj = makeObj({ id: "get-obj" });
      server.objects.set(obj.id, obj);

      const res = await server.onRequest({ method: "GET" } as any);
      const body = await res.json();

      expect(body.objects).toEqual([obj]);
      expect(body.frames).toEqual(server.frames);
    });

    test("POST without auth → 401", async () => {
      const res = await server.onRequest({
        method: "POST",
        headers: { get: () => null } as any,
        json: () => Promise.resolve({ actions: [] }),
      } as any);

      expect(res.status).toBe(401);
    });

    test("POST with valid auth processes actions", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({ ok: true, text: () => Promise.resolve("") })
      ) as any;

      const obj = makeObj({ id: "api-obj" });
      const res = await server.onRequest({
        method: "POST",
        headers: { get: (h: string) => h === "Authorization" ? "Bearer test-secret" : null } as any,
        json: () => Promise.resolve({
          actions: [{ type: "create", object: obj }],
        }),
      } as any);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(server.objects.get("api-obj")).toEqual(obj);
    });

    test("POST with wrong auth → 401", async () => {
      const res = await server.onRequest({
        method: "POST",
        headers: { get: (h: string) => h === "Authorization" ? "Bearer wrong" : null } as any,
        json: () => Promise.resolve({ actions: [] }),
      } as any);

      expect(res.status).toBe(401);
    });
  });
});
