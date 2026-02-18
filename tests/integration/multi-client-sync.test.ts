import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { startPartyKit, stopPartyKit, createWsClient, waitForCondition, getPort } from "./helpers";
import { makeObj } from "../helpers/factory";
import type { ServerMessage } from "../../src/types/messages";

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

describe("multi-client sync", () => {
  test("2 clients connect → both get presence with 2 users", async () => {
    const rid = roomId();
    const clientA = await createWsClient(port, rid, "userA", "Alice");
    const clientB = await createWsClient(port, rid, "userB", "Bob");

    // Both should eventually see presence with 2 users
    await waitForCondition(() => {
      const presenceMsgs = clientA.messages.filter((m) => m.type === "presence");
      return presenceMsgs.some((m) => (m as any).users.length === 2);
    }, 5000, "clientA sees 2 users");

    await waitForCondition(() => {
      const presenceMsgs = clientB.messages.filter((m) => m.type === "presence");
      return presenceMsgs.some((m) => (m as any).users.length === 2);
    }, 5000, "clientB sees 2 users");

    clientA.close();
    clientB.close();
  }, 10_000);

  test("Client A creates object → Client B receives object:create", async () => {
    const rid = roomId();
    const clientA = await createWsClient(port, rid, "userA", "Alice");
    const clientB = await createWsClient(port, rid, "userB", "Bob");

    // Wait for both connected
    await waitForCondition(() =>
      clientB.messages.some((m) => m.type === "presence" && (m as any).users.length === 2)
    , 5000, "both connected");

    const obj = makeObj({ id: "test-create", board_id: rid });
    clientA.ws.send(JSON.stringify({ type: "object:create", object: obj }));

    await waitForCondition(() =>
      clientB.messages.some((m) => m.type === "object:create" && (m as any).object.id === "test-create")
    , 5000, "clientB receives object:create");

    clientA.close();
    clientB.close();
  }, 10_000);

  test("concurrent updates → both receive each other's updates", async () => {
    const rid = roomId();
    const clientA = await createWsClient(port, rid, "userA", "Alice");
    const clientB = await createWsClient(port, rid, "userB", "Bob");

    // Wait connected
    await waitForCondition(() =>
      clientB.messages.some((m) => m.type === "presence" && (m as any).users.length === 2)
    , 5000, "both connected");

    // Both create an object first
    const objA = makeObj({ id: "obj-a", board_id: rid });
    const objB = makeObj({ id: "obj-b", board_id: rid });
    clientA.ws.send(JSON.stringify({ type: "object:create", object: objA }));
    clientB.ws.send(JSON.stringify({ type: "object:create", object: objB }));

    // Wait for creates to propagate
    await waitForCondition(() =>
      clientA.messages.some((m) => m.type === "object:create" && (m as any).object.id === "obj-b") &&
      clientB.messages.some((m) => m.type === "object:create" && (m as any).object.id === "obj-a")
    , 5000, "creates propagated");

    // Now send concurrent updates
    const updA = { ...objA, text: "from-A", updated_at: new Date().toISOString() };
    const updB = { ...objB, text: "from-B", updated_at: new Date().toISOString() };
    clientA.ws.send(JSON.stringify({ type: "object:update", object: updA }));
    clientB.ws.send(JSON.stringify({ type: "object:update", object: updB }));

    await waitForCondition(() =>
      clientA.messages.some((m) => m.type === "object:update" && (m as any).object.id === "obj-b") &&
      clientB.messages.some((m) => m.type === "object:update" && (m as any).object.id === "obj-a")
    , 5000, "updates received");

    clientA.close();
    clientB.close();
  }, 10_000);

  test("disconnect and reconnect → gets full sync", async () => {
    const rid = roomId();
    const clientA = await createWsClient(port, rid, "userA", "Alice");

    // Wait for initial sync
    await waitForCondition(() =>
      clientA.messages.some((m) => m.type === "sync")
    , 5000, "initial sync");

    // Create an object
    const obj = makeObj({ id: "persist-obj", board_id: rid });
    clientA.ws.send(JSON.stringify({ type: "object:create", object: obj }));
    await Bun.sleep(200);

    // Disconnect
    clientA.close();
    await Bun.sleep(500);

    // Reconnect
    const clientA2 = await createWsClient(port, rid, "userA", "Alice");

    await waitForCondition(() => {
      const syncMsg = clientA2.messages.find((m) => m.type === "sync");
      return syncMsg !== undefined && (syncMsg as any).objects.some((o: any) => o.id === "persist-obj");
    }, 5000, "reconnect sync has object");

    clientA2.close();
  }, 15_000);

  test("rapid: 100 object:create from A → B receives all 100", async () => {
    const rid = roomId();
    const clientA = await createWsClient(port, rid, "userA", "Alice");
    const clientB = await createWsClient(port, rid, "userB", "Bob");

    await waitForCondition(() =>
      clientB.messages.some((m) => m.type === "presence" && (m as any).users.length === 2)
    , 5000, "both connected");

    // Send 100 creates
    for (let i = 0; i < 100; i++) {
      const obj = makeObj({ id: `rapid-${i}`, board_id: rid });
      clientA.ws.send(JSON.stringify({ type: "object:create", object: obj }));
    }

    // Wait for B to receive all 100
    await waitForCondition(() => {
      const creates = clientB.messages.filter(
        (m) => m.type === "object:create" && (m as any).object.id.startsWith("rapid-")
      );
      return creates.length >= 100;
    }, 10_000, "100 creates received");

    clientA.close();
    clientB.close();
  }, 15_000);
});
