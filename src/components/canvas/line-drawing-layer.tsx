"use client";

import { memo } from "react";
import { Circle, Line } from "react-konva";

interface LineDrawingLayerProps {
  points: Array<{ x: number; y: number }>;
  cursorPos: { x: number; y: number } | null;
  snapTarget?: { x: number; y: number } | null;
}

export const LineDrawingLayer = memo(function LineDrawingLayer({
  points,
  cursorPos,
  snapTarget,
}: LineDrawingLayerProps) {
  // Always render when snap target is active (pre-draw hover feedback)
  if (points.length === 0 && !snapTarget) return null;

  // Committed segments
  const committedFlat = points.flatMap((p) => [p.x, p.y]);

  // Rubber band from last point to cursor (or snap target)
  const lastPoint = points[points.length - 1];
  const endPos = snapTarget || cursorPos;
  const rubberBand =
    endPos && lastPoint
      ? [lastPoint.x, lastPoint.y, endPos.x, endPos.y]
      : null;

  return (
    <>
      {/* Committed segments */}
      {points.length >= 2 && (
        <Line
          points={committedFlat}
          stroke="#3b82f6"
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}

      {/* Rubber band */}
      {rubberBand && (
        <Line
          points={rubberBand}
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[6, 4]}
          lineCap="round"
          listening={false}
        />
      )}

      {/* Point handles */}
      {points.map((p, i) => (
        <Circle
          key={i}
          x={p.x}
          y={p.y}
          radius={4}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1.5}
          listening={false}
        />
      ))}

      {/* Snap indicator */}
      {snapTarget && (
        <Circle
          x={snapTarget.x}
          y={snapTarget.y}
          radius={8}
          fill="#3b82f6"
          opacity={0.6}
          listening={false}
        />
      )}
    </>
  );
});
