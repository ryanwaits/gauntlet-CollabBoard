"use client";

import { memo, useRef, useCallback } from "react";
import { Rect } from "react-konva";
import type Konva from "konva";

interface ResizeHandlesProps {
  width: number;
  height: number;
  scale: number;
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

export const ResizeHandles = memo(function ResizeHandles({
  width,
  height,
  scale,
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
  } | null>(null);

  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const onResizeEndRef = useRef(onResizeEnd);
  onResizeEndRef.current = onResizeEnd;

  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startClientX) / d.stageScale;
    const dy = (e.clientY - d.startClientY) / d.stageScale;
    onResizeRef.current(computeUpdates(d.corner, dx, dy, d.startW, d.startH));
  }, []);

  const handleWindowMouseUp = useCallback((e: MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startClientX) / d.stageScale;
    const dy = (e.clientY - d.startClientY) / d.stageScale;
    onResizeEndRef.current(computeUpdates(d.corner, dx, dy, d.startW, d.startH));
    dragRef.current = null;
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [handleWindowMouseMove]);

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
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
  }, [width, height, handleWindowMouseMove, handleWindowMouseUp]);

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
