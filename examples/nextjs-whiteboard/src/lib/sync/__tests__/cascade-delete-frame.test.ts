import { describe, it, expect, beforeEach } from "bun:test";
import { LiveObject } from "@waits/openblocks-storage";
import { LiveMap } from "@waits/openblocks-storage";
import { StorageDocument } from "@waits/openblocks-storage";
import { cascadeDeleteFrame } from "../cascade-delete-frame";
import {
  frameOriginX,
  FRAME_ORIGIN_Y,
  BOARD_WIDTH,
  BOARD_HEIGHT,
} from "../../geometry/frames";

// Frame 0 bounds: x [-2000, 2000], y [-1500, 1500]
// Frame 1 bounds: x [2200, 6200], y [-1500, 1500]
const F0_CENTER_X = frameOriginX(0) + BOARD_WIDTH / 2; // 0
const F1_CENTER_X = frameOriginX(1) + BOARD_WIDTH / 2; // 4200
const CENTER_Y = FRAME_ORIGIN_Y + BOARD_HEIGHT / 2; // 0

function makeShape(id: string, x: number, y: number, type = "sticky" as string) {
  return new LiveObject({
    id,
    board_id: "board-1",
    type,
    x,
    y,
    width: 200,
    height: 150,
    color: "#fff",
    text: "",
    z_index: 1,
    created_by: null,
    updated_at: new Date().toISOString(),
  });
}

function makeLine(
  id: string,
  points: Array<{ x: number; y: number }>,
  startObjectId?: string | null,
  endObjectId?: string | null
) {
  return new LiveObject({
    id,
    board_id: "board-1",
    type: "line",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    color: "#000",
    text: "",
    z_index: 1,
    created_by: null,
    updated_at: new Date().toISOString(),
    points: JSON.stringify(points),
    start_object_id: startObjectId ?? null,
    end_object_id: endObjectId ?? null,
  });
}

function makeFrame(id: string, index: number, label: string) {
  return new LiveObject({ id, index, label });
}

describe("cascadeDeleteFrame", () => {
  let objects: LiveMap<LiveObject>;
  let frames: LiveMap<LiveObject>;
  let doc: StorageDocument;

  beforeEach(() => {
    objects = new LiveMap<LiveObject>();
    frames = new LiveMap<LiveObject>();
    const root = new LiveObject({ objects, frames });
    doc = new StorageDocument(root);
  });

  /**
   * Helper: serialize then deserialize the doc (simulates server round-trip).
   * Returns the new root's objects and frames LiveMaps.
   */
  function roundTrip(): { objects: LiveMap<LiveObject>; frames: LiveMap<LiveObject>; doc: StorageDocument } {
    const serialized = doc.serialize();
    const newDoc = StorageDocument.deserialize(serialized);
    const newRoot = newDoc.getRoot();
    return {
      objects: newRoot.get("objects") as LiveMap<LiveObject>,
      frames: newRoot.get("frames") as LiveMap<LiveObject>,
      doc: newDoc,
    };
  }

  it("deletes shapes within the target frame", () => {
    // Shape centered in frame 1 bounds
    objects.set("s1", makeShape("s1", F1_CENTER_X - 100, CENTER_Y - 75));
    objects.set("s2", makeShape("s2", F1_CENTER_X + 100, CENTER_Y + 100));
    // Shape in frame 0 (should survive)
    objects.set("s0", makeShape("s0", F0_CENTER_X - 100, CENTER_Y - 75));

    frames.set("frame-0", makeFrame("frame-0", 0, "Frame 1"));
    frames.set("frame-1", makeFrame("frame-1", 1, "Frame 2"));

    cascadeDeleteFrame(objects, frames, "frame-1");

    expect(objects.has("s1")).toBe(false);
    expect(objects.has("s2")).toBe(false);
    expect(objects.has("s0")).toBe(true); // survived
    expect(frames.has("frame-1")).toBe(false);
    expect(frames.has("frame-0")).toBe(true);
  });

  it("cascade-deletes lines connected to deleted shapes", () => {
    objects.set("s1", makeShape("s1", F1_CENTER_X - 100, CENTER_Y - 75));
    objects.set("s2", makeShape("s2", F1_CENTER_X + 100, CENTER_Y + 100));
    // Line connected between two shapes in frame 1
    objects.set(
      "line-1",
      makeLine(
        "line-1",
        [
          { x: F1_CENTER_X, y: CENTER_Y },
          { x: F1_CENTER_X + 200, y: CENTER_Y + 100 },
        ],
        "s1",
        "s2"
      )
    );
    // Line connecting frame-1 shape to frame-0 shape (should also be deleted)
    objects.set("s0", makeShape("s0", F0_CENTER_X, CENTER_Y));
    objects.set(
      "line-cross",
      makeLine(
        "line-cross",
        [
          { x: F0_CENTER_X + 100, y: CENTER_Y },
          { x: F1_CENTER_X, y: CENTER_Y },
        ],
        "s0",
        "s1"
      )
    );

    frames.set("frame-1", makeFrame("frame-1", 1, "Frame 2"));

    cascadeDeleteFrame(objects, frames, "frame-1");

    expect(objects.has("s1")).toBe(false);
    expect(objects.has("s2")).toBe(false);
    expect(objects.has("line-1")).toBe(false);
    expect(objects.has("line-cross")).toBe(false); // connected to deleted s1
    expect(objects.has("s0")).toBe(true); // in frame 0, survives
  });

  it("cascade-deletes unconnected lines within frame bounds", () => {
    const lx = F1_CENTER_X;
    const ly = CENTER_Y;
    objects.set(
      "free-line",
      makeLine("free-line", [
        { x: lx - 50, y: ly },
        { x: lx + 50, y: ly },
      ])
    );

    frames.set("frame-1", makeFrame("frame-1", 1, "Frame 2"));

    cascadeDeleteFrame(objects, frames, "frame-1");

    expect(objects.has("free-line")).toBe(false);
  });

  it("leaves unconnected lines outside frame bounds alone", () => {
    objects.set(
      "outside-line",
      makeLine("outside-line", [
        { x: F0_CENTER_X - 50, y: CENTER_Y },
        { x: F0_CENTER_X + 50, y: CENTER_Y },
      ])
    );

    frames.set("frame-1", makeFrame("frame-1", 1, "Frame 2"));

    cascadeDeleteFrame(objects, frames, "frame-1");

    expect(objects.has("outside-line")).toBe(true);
  });

  it("no-ops when frame ID does not exist", () => {
    objects.set("s1", makeShape("s1", F1_CENTER_X, CENTER_Y));
    frames.set("frame-1", makeFrame("frame-1", 1, "Frame 2"));

    cascadeDeleteFrame(objects, frames, "nonexistent");

    expect(objects.has("s1")).toBe(true);
    expect(frames.has("frame-1")).toBe(true);
  });

  it("handles objects exactly on frame boundary", () => {
    // Object with center exactly on left edge of frame 1
    const fx = frameOriginX(1);
    objects.set("edge", makeShape("edge", fx - 100, CENTER_Y - 75));
    // center x = fx - 100 + 200/2 = fx, center y = CENTER_Y - 75 + 150/2 = CENTER_Y
    // Should be included (>= fx)

    frames.set("frame-1", makeFrame("frame-1", 1, "Frame 2"));

    cascadeDeleteFrame(objects, frames, "frame-1");

    expect(objects.has("edge")).toBe(false);
  });

  it("works after serialize/deserialize round-trip (server snapshot)", () => {
    objects.set("s1", makeShape("s1", F1_CENTER_X - 100, CENTER_Y - 75));
    objects.set("s2", makeShape("s2", F1_CENTER_X + 100, CENTER_Y + 100));
    objects.set("s0", makeShape("s0", F0_CENTER_X - 100, CENTER_Y - 75));
    frames.set("frame-0", makeFrame("frame-0", 0, "Frame 1"));
    frames.set("frame-1", makeFrame("frame-1", 1, "Frame 2"));

    // Round-trip through serialization (simulates receiving server snapshot)
    const rt = roundTrip();

    cascadeDeleteFrame(rt.objects, rt.frames, "frame-1");

    expect(rt.objects.has("s1")).toBe(false);
    expect(rt.objects.has("s2")).toBe(false);
    expect(rt.objects.has("s0")).toBe(true);
    expect(rt.frames.has("frame-1")).toBe(false);
    expect(rt.frames.has("frame-0")).toBe(true);
  });

  it("deep subscription fires and re-read shows deleted objects gone", () => {
    objects.set("s1", makeShape("s1", F1_CENTER_X - 100, CENTER_Y - 75));
    objects.set("s2", makeShape("s2", F1_CENTER_X + 100, CENTER_Y + 100));
    frames.set("frame-1", makeFrame("frame-1", 1, "Frame 2"));

    // Simulate the sync hook pattern: deep subscribe → re-read on change
    let lastSyncedIds: string[] = [];
    doc.subscribe(objects, () => {
      lastSyncedIds = [];
      objects.forEach((_lo: LiveObject, id: string) => {
        lastSyncedIds.push(id);
      });
    }, { isDeep: true });

    cascadeDeleteFrame(objects, frames, "frame-1");

    // After cascade, the subscriber should have seen all objects removed
    expect(lastSyncedIds).toEqual([]);
    expect(objects.size).toBe(0);
  });

  it("reproduces bug: delete frame, recreate, old objects should not reappear", () => {
    // Set up frame 1 with objects
    objects.set("s1", makeShape("s1", F1_CENTER_X - 100, CENTER_Y - 75));
    objects.set("s2", makeShape("s2", F1_CENTER_X + 100, CENTER_Y + 100));
    frames.set("frame-1", makeFrame("frame-1", 1, "Frame 2"));

    // Delete frame 1
    cascadeDeleteFrame(objects, frames, "frame-1");

    // Verify deletion
    expect(objects.has("s1")).toBe(false);
    expect(objects.has("s2")).toBe(false);
    expect(frames.has("frame-1")).toBe(false);

    // Recreate frame 1
    frames.set("frame-1", makeFrame("frame-1", 1, "Frame 2 (new)"));

    // Old objects should NOT reappear when iterating
    const objectIds: string[] = [];
    objects.forEach((_lo: LiveObject, id: string) => {
      objectIds.push(id);
    });
    expect(objectIds).toEqual([]);
    expect(objects.size).toBe(0);
  });
});
