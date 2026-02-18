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

describe("load", () => {
  test("5 clients connect → all see presence with 5 users", async () => {
    const rid = roomId();
    const clients = [];
    for (let i = 0; i < 5; i++) {
      clients.push(await createWsClient(port, rid, `user-${i}`, `User ${i}`));
    }

    // All should eventually see 5 users
    for (const client of clients) {
      await waitForCondition(() => {
        const presenceMsgs = client.messages.filter((m) => m.type === "presence");
        return presenceMsgs.some((m) => (m as any).users.length === 5);
      }, 10_000, "all see 5 users");
    }

    for (const client of clients) client.close();
  }, 15_000);

  test("5 clients send cursor:update → each receives 4 broadcasts", async () => {
    const rid = roomId();
    const clients = [];
    for (let i = 0; i < 5; i++) {
      clients.push(await createWsClient(port, rid, `user-${i}`, `User ${i}`));
    }

    // Wait for all connected
    for (const client of clients) {
      await waitForCondition(() =>
        client.messages.some((m) => m.type === "presence" && (m as any).users.length === 5)
      , 10_000, "5 users present");
    }

    // Clear messages for clean count
    for (const client of clients) {
      client.messages.length = 0;
    }

    // Each sends a cursor update
    for (let i = 0; i < 5; i++) {
      clients[i].ws.send(JSON.stringify({
        type: "cursor:update",
        x: i * 100,
        y: i * 50,
      }));
    }

    // Each should receive 4 cursor updates (from the other 4)
    for (const client of clients) {
      await waitForCondition(() => {
        const cursorMsgs = client.messages.filter((m) => m.type === "cursor:update");
        return cursorMsgs.length >= 4;
      }, 5000, "receives 4 cursor updates");
    }

    for (const client of clients) client.close();
  }, 15_000);

  test("latency: object:create round-trip < 2000ms", async () => {
    const rid = roomId();
    const clientA = await createWsClient(port, rid, "userA", "Alice");
    const clientB = await createWsClient(port, rid, "userB", "Bob");

    await waitForCondition(() =>
      clientB.messages.some((m) => m.type === "presence" && (m as any).users.length === 2)
    , 5000, "both connected");

    const start = performance.now();
    const obj = makeObj({ id: "latency-test", board_id: rid });
    clientA.ws.send(JSON.stringify({ type: "object:create", object: obj }));

    await waitForCondition(() =>
      clientB.messages.some((m) => m.type === "object:create" && (m as any).object.id === "latency-test")
    , 5000, "create received");

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);

    clientA.close();
    clientB.close();
  }, 10_000);
});
