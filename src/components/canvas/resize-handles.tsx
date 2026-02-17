"use client";

import { memo, useRef, useCallback } from "react";
import { Rect } from "react-konva";
import type Konva from "konva";

interface ResizeHandlesProps {
  width: number;
  height: number;
  scale: number;
  rotation?: number;
  objectX?: number;
  objectY?: number;
  onResize: (updates: { x: number; y: number; width: number; height: number }) => void;
  onResizeEnd: (updates: { x: number; y: number; width: number; height: number }) => void;
  visible: boolean;
}

const HANDLE_SIZE = 8;
const MIN_WIDTH = 50;
const MIN_HEIGHT = 30;

type Corner = "tl" | "tr" | "bl" | "br";

const corners: { key: Corner; getX: (w: number) => number; getY: (h: number) => number }[] = [
  { key: "tl", getX: () => 0, getY: () => 0 },
  { key: "tr", getX: (w) => w, getY: () => 0 },
  { key: "bl", getX: () => 0, getY: (h) => h },
  { key: "br", getX: (w) => w, getY: (h) => h },
];

function computeUpdates(corner: Corner, dx: number, dy: number, startW: number, startH: number) {
  let newX = 0;
  let newY = 0;
  let newW = startW;
  let newH = startH;

  switch (corner) {
    case "br":
      newW = Math.max(MIN_WIDTH, startW + dx);
      newH = Math.max(MIN_HEIGHT, startH + dy);
      break;
    case "bl":
      newW = Math.max(MIN_WIDTH, startW - dx);
      newH = Math.max(MIN_HEIGHT, startH + dy);
      newX = startW - newW;
      break;
    case "tr":
      newW = Math.max(MIN_WIDTH, startW + dx);
      newH = Math.max(MIN_HEIGHT, startH - dy);
      newY = startH - newH;
      break;
    case "tl":
      newW = Math.max(MIN_WIDTH, startW - dx);
      newH = Math.max(MIN_HEIGHT, startH - dy);
      newX = startW - newW;
      newY = startH - newH;
      break;
  }

  return { x: newX, y: newY, width: newW, height: newH };
}

/**
 * Compute resize updates for a rotated shape using the anchor-corner algorithm.
 * The corner opposite to the one being dragged stays fixed in world space.
 */
function computeRotatedUpdates(
  corner: Corner,
  dx: number,
  dy: number,
  startW: number,
  startH: number,
  rotation: number,
  objX: number,
  objY: number,
) {
  const rad = rotation * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Un-rotate mouse deltas to local space
  const localDx = dx * cos + dy * sin;
  const localDy = -dx * sin + dy * cos;

  // Compute new size in local space
  const local = computeUpdates(corner, localDx, localDy, startW, startH);

  // Old center
  const oldCx = objX + startW / 2;
  const oldCy = objY + startH / 2;

  // Anchor corner's local offset from center (opposite corner to the one being dragged)
  let aX: number, aY: number;
  switch (corner) {
    case "br": aX = -startW / 2; aY = -startH / 2; break; // anchor = tl
    case "bl": aX = startW / 2; aY = -startH / 2; break;   // anchor = tr
    case "tr": aX = -startW / 2; aY = startH / 2; break;   // anchor = bl
    case "tl": aX = startW / 2; aY = startH / 2; break;     // anchor = br
  }

  // Anchor corner in world space
  const anchorWX = oldCx + aX * cos - aY * sin;
  const anchorWY = oldCy + aX * sin + aY * cos;

  // New anchor offset from new center (same corner, new dimensions)
  let naX: number, naY: number;
  switch (corner) {
    case "br": naX = -local.width / 2; naY = -local.height / 2; break;
    case "bl": naX = local.width / 2; naY = -local.height / 2; break;
    case "tr": naX = -local.width / 2; naY = local.height / 2; break;
    case "tl": naX = local.width / 2; naY = local.height / 2; break;
  }

  // New center: anchor stays fixed → newCenter = anchorWorld - rotate(newAnchorLocal, R)
  const newCx = anchorWX - (naX * cos - naY * sin);
  const newCy = anchorWY - (naX * sin + naY * cos);

  // New top-left, as delta from original position
  const newX = newCx - local.width / 2;
  const newY = newCy - local.height / 2;

  return { x: newX - objX, y: newY - objY, width: local.width, height: local.height };
}

export const ResizeHandles = memo(function ResizeHandles({
  width,
  height,
  scale,
  rotation = 0,
  objectX = 0,
  objectY = 0,
  onResize,
  onResizeEnd,
  visible,
}: ResizeHandlesProps) {
  const dragRef = useRef<{
    corner: Corner;
    startClientX: number;
    startClientY: number;
    startW: number;
    startH: number;
    stageScale: number;
    rotation: number;
    objX: number;
    objY: number;
  } | null>(null);

  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const onResizeEndRef = useRef(onResizeEnd);
  onResizeEndRef.current = onResizeEnd;

  const compute = useCallback((dx: number, dy: number) => {
    const d = dragRef.current!;
    if (d.rotation === 0) {
      return computeUpdates(d.corner, dx, dy, d.startW, d.startH);
    }
    return computeRotatedUpdates(d.corner, dx, dy, d.startW, d.startH, d.rotation, d.objX, d.objY);
  }, []);

  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startClientX) / d.stageScale;
    const dy = (e.clientY - d.startClientY) / d.stageScale;
    onResizeRef.current(compute(dx, dy));
  }, [compute]);

  const handleWindowMouseUp = useCallback((e: MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startClientX) / d.stageScale;
    const dy = (e.clientY - d.startClientY) / d.stageScale;
    onResizeEndRef.current(compute(dx, dy));
    dragRef.current = null;
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [compute, handleWindowMouseMove]);

  const handleMouseDown = useCallback((corner: Corner, e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    const stage = e.target.getStage();
    if (!stage) return;

    dragRef.current = {
      corner,
      startClientX: e.evt.clientX,
      startClientY: e.evt.clientY,
      startW: width,
      startH: height,
      stageScale: stage.scaleX(),
      rotation,
      objX: objectX,
      objY: objectY,
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
  }, [width, height, rotation, objectX, objectY, handleWindowMouseMove, handleWindowMouseUp]);

  if (!visible) return null;

  const handleSize = HANDLE_SIZE / scale;
  const halfHandle = handleSize / 2;

  return (
    <>
      {corners.map(({ key, getX, getY }) => (
        <Rect
          key={key}
          x={getX(width) - halfHandle}
          y={getY(height) - halfHandle}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1.5 / scale}
          cornerRadius={1.5 / scale}
          onMouseDown={(e) => handleMouseDown(key, e)}
        />
      ))}
    </>
  );
});
