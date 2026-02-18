import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { startPartyKit, stopPartyKit, createWsClient, waitForCondition, getPort } from "./helpers";
import { makeObj } from "../helpers/factory";

let proc: ReturnType<typeof Bun.spawn>;
let port: number;

beforeAll(async () => {
  const result = await startPartyKit();
  proc = result.proc;
  port = result.port;
}, 20_000);

afterAll(() => {
  stopPartyKit(proc);
});

function roomId() {
  return crypto.randomUUID();
}

describe("persistence (in-memory)", () => {
  test("objects created via WS → HTTP GET returns them", async () => {
    const rid = roomId();
    const client = await createWsClient(port, rid, "user1", "Alice");

    await waitForCondition(() =>
      client.messages.some((m) => m.type === "sync")
    , 5000, "initial sync");

    const obj = makeObj({ id: "http-check", board_id: rid });
    client.ws.send(JSON.stringify({ type: "object:create", object: obj }));
    await Bun.sleep(500);

    // HTTP GET should return the object
    const res = await fetch(`http://127.0.0.1:${port}/parties/main/${rid}`);
    const body = await res.json();

    expect(body.objects.some((o: any) => o.id === "http-check")).toBe(true);

    client.close();
  }, 10_000);

  test("all clients disconnect, new client gets sync with prior objects", async () => {
    const rid = roomId();
    const client1 = await createWsClient(port, rid, "user1", "Alice");

    await waitForCondition(() =>
      client1.messages.some((m) => m.type === "sync")
    , 5000, "sync");

    // Create objects
    const obj1 = makeObj({ id: "persist-1", board_id: rid });
    const obj2 = makeObj({ id: "persist-2", board_id: rid });
    client1.ws.send(JSON.stringify({ type: "object:create", object: obj1 }));
    client1.ws.send(JSON.stringify({ type: "object:create", object: obj2 }));
    await Bun.sleep(500);

    // Disconnect all
    client1.close();
    await Bun.sleep(500);

    // New client connects
    const client2 = await createWsClient(port, rid, "user2", "Bob");

    await waitForCondition(() => {
      const syncMsg = client2.messages.find((m) => m.type === "sync");
      if (!syncMsg) return false;
      const objects = (syncMsg as any).objects;
      return objects.some((o: any) => o.id === "persist-1") &&
             objects.some((o: any) => o.id === "persist-2");
    }, 5000, "new client gets persisted objects");

    client2.close();
  }, 15_000);
});
