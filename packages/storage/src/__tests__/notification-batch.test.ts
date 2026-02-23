import { describe, it, expect } from "bun:test";
import { StorageDocument } from "../storage-document";
import { LiveObject } from "../live-object";
import { LiveMap } from "../live-map";

describe("notification batching", () => {
  it("applyOps with N ops fires deep subscriber once", () => {
    const map = new LiveMap<number>();
    const root = new LiveObject({ map });
    const doc = new StorageDocument(root);

    // Pre-populate keys so ops resolve
    map.set("a", 0);
    map.set("b", 0);
    map.set("c", 0);

    let deepFired = 0;
    doc.subscribe(root, () => deepFired++, { isDeep: true });
    deepFired = 0; // reset after subscribe

    // Apply 100 remote ops in one batch
    const ops = Array.from({ length: 100 }, (_, i) => ({
      type: "set" as const,
      path: ["map"],
      key: "a",
      value: i + 1,
      clock: 100 + i,
    }));

    doc.applyOps(ops);
    expect(deepFired).toBe(1);
  });

  it("local set() fires subscriber immediately (not batched)", () => {
    const root = new LiveObject<{ x: number }>({ x: 0 });
    const doc = new StorageDocument(root);

    let fired = 0;
    doc.subscribe(root, () => fired++);

    root.set("x", 1);
    expect(fired).toBe(1);

    root.set("x", 2);
    expect(fired).toBe(2);
  });

  it("applyLocalOps (undo/redo) with N ops fires deep subscriber once", () => {
    const root = new LiveObject<{ a: number; b: number }>({ a: 0, b: 0 });
    const doc = new StorageDocument(root);
    const history = doc.getHistory();

    // Create a batch of changes to undo
    history.startBatch();
    root.set("a", 10);
    root.set("b", 20);
    history.endBatch();

    let deepFired = 0;
    doc.subscribe(root, () => deepFired++, { isDeep: true });
    deepFired = 0;

    // Undo fires applyLocalOps with 2 ops
    const inverseOps = history.undo()!;
    doc.applyLocalOps(inverseOps);

    expect(root.get("a")).toBe(0);
    expect(root.get("b")).toBe(0);
    expect(deepFired).toBe(1);
  });

  it("mixed: local op then remote ops → correct fire count", () => {
    const root = new LiveObject<{ x: number; y: number }>({ x: 0, y: 0 });
    const doc = new StorageDocument(root);

    let deepFired = 0;
    doc.subscribe(root, () => deepFired++, { isDeep: true });
    deepFired = 0;

    // Local op fires immediately
    root.set("x", 1);
    expect(deepFired).toBe(1);

    // Remote ops batch — fires once
    doc.applyOps([
      { type: "set", path: [], key: "y", value: 10, clock: 50 },
      { type: "set", path: [], key: "y", value: 20, clock: 51 },
      { type: "set", path: [], key: "y", value: 30, clock: 52 },
    ]);
    expect(deepFired).toBe(2); // 1 local + 1 batched
  });

  it("applyOps fires shallow subscribers for each changed node", () => {
    const inner = new LiveObject<{ val: number }>({ val: 0 });
    const root = new LiveObject({ nested: inner });
    const doc = new StorageDocument(root);

    let shallowFired = 0;
    doc.subscribe(inner, () => shallowFired++);
    shallowFired = 0;

    doc.applyOps([
      { type: "set", path: ["nested"], key: "val", value: 1, clock: 10 },
      { type: "set", path: ["nested"], key: "val", value: 2, clock: 11 },
    ]);

    // Shallow fires once per node in the batch (inner appears once in the Set)
    expect(shallowFired).toBe(1);
  });

  it("multiple deep subscribers on same target each fire once per batch", () => {
    const root = new LiveObject<{ x: number }>({ x: 0 });
    const doc = new StorageDocument(root);

    let fired1 = 0;
    let fired2 = 0;
    doc.subscribe(root, () => fired1++, { isDeep: true });
    doc.subscribe(root, () => fired2++, { isDeep: true });
    fired1 = 0;
    fired2 = 0;

    doc.applyOps([
      { type: "set", path: [], key: "x", value: 1, clock: 10 },
      { type: "set", path: [], key: "x", value: 2, clock: 11 },
    ]);

    expect(fired1).toBe(1);
    expect(fired2).toBe(1);
  });
});
