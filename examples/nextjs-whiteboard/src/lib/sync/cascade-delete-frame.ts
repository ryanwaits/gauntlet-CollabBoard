import type { LiveMap, LiveObject } from "@waits/openblocks-client";
import type { BoardObject, Frame } from "@/types/board";
import { frameOriginX, FRAME_ORIGIN_Y, BOARD_WIDTH, BOARD_HEIGHT } from "@/lib/geometry/frames";

/**
 * Pure cascade-delete logic extracted from the deleteFrame mutation.
 * Deletes all objects whose center falls within the frame bounds,
 * lines connected to those objects, unconnected lines within bounds,
 * and the frame itself.
 */
export function cascadeDeleteFrame(
  objects: LiveMap<LiveObject>,
  frames: LiveMap<LiveObject>,
  frameId: string
): void {
  const frameLO = frames.get(frameId);
  if (!frameLO) return;

  const frameData = frameLO.toObject() as unknown as Frame;

  // Compute frame bounds
  const fx = frameOriginX(frameData.index);
  const fy = FRAME_ORIGIN_Y;
  const fr = fx + BOARD_WIDTH;
  const fb = fy + BOARD_HEIGHT;

  // Collect objects to delete (center within frame bounds)
  const deletedIds = new Set<string>();
  objects.forEach((lo: LiveObject, id: string) => {
    const obj = lo.toObject() as unknown as BoardObject;
    if (obj.type === "line") return;
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    if (cx >= fx && cx <= fr && cy >= fy && cy <= fb) {
      deletedIds.add(id);
    }
  });

  // Cascade: lines connected to deleted objects
  objects.forEach((lo: LiveObject, id: string) => {
    const obj = lo.toObject() as unknown as BoardObject;
    if (obj.type !== "line") return;
    if (
      (obj.start_object_id && deletedIds.has(obj.start_object_id)) ||
      (obj.end_object_id && deletedIds.has(obj.end_object_id))
    ) {
      deletedIds.add(id);
    }
  });

  // Unconnected lines within bounds
  objects.forEach((lo: LiveObject, id: string) => {
    if (deletedIds.has(id)) return;
    const obj = lo.toObject() as unknown as BoardObject;
    if (obj.type !== "line") return;
    let points = obj.points;
    if (typeof points === "string") {
      try {
        points = JSON.parse(points as unknown as string);
      } catch {
        return;
      }
    }
    if (points && points.length >= 2) {
      const cx = (points[0].x + points[points.length - 1].x) / 2;
      const cy = (points[0].y + points[points.length - 1].y) / 2;
      if (cx >= fx && cx <= fr && cy >= fy && cy <= fb) {
        deletedIds.add(id);
      }
    }
  });

  // Delete objects
  for (const id of deletedIds) {
    objects.delete(id);
  }

  // Delete frame
  frames.delete(frameId);
}
