"use client";

import { memo, useMemo, useCallback, useRef } from "react";
import { Arrow, Circle, Group, Line, Rect, Text } from "react-konva";
import type Konva from "konva";
import { computeEdgePoint, computeLineBounds } from "@/lib/geometry/edge-intersection";
import { findSnapTarget } from "@/lib/geometry/snap";
import type { BoardObject } from "@/types/board";

interface LineShapeProps {
  id: string;
  object: BoardObject;
  objects: Map<string, BoardObject>;
  isSelected: boolean;
  onSelect?: (id: string, shiftKey?: boolean) => void;
  onLineUpdate?: (id: string, updates: Partial<BoardObject>) => void;
  onLineUpdateEnd?: (id: string, updates: Partial<BoardObject>) => void;
  interactive?: boolean;
}

export const LineShape = memo(function LineShape({
  id,
  object,
  objects,
  isSelected,
  onSelect,
  onLineUpdate,
  onLineUpdateEnd,
  interactive = true,
}: LineShapeProps) {
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartPointsRef = useRef<Array<{ x: number; y: number }> | null>(null);

  const handleBodyDragStart = useCallback(() => {
    dragStartPointsRef.current = object.points ? [...object.points] : null;
  }, [object.points]);

  const handleBodyDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!onLineUpdateEnd || !dragStartPointsRef.current) return;
      const group = e.currentTarget;
      const dx = group.x();
      const dy = group.y();
      const newPoints = dragStartPointsRef.current.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      const bounds = computeLineBounds(newPoints);
      onLineUpdateEnd(id, {
        points: newPoints,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        start_object_id: null,
        end_object_id: null,
      });
      group.x(0);
      group.y(0);
      dragStartPointsRef.current = null;
    },
    [id, onLineUpdateEnd]
  );

  const resolvedPoints = useMemo(() => {
    const pts = object.points ? [...object.points] : [];
    if (pts.length < 2) return pts;

    if (object.start_object_id) {
      const startObj = objects.get(object.start_object_id);
      if (startObj) {
        pts[0] = computeEdgePoint(startObj, pts[1]);
      }
    }
    if (object.end_object_id) {
      const endObj = objects.get(object.end_object_id);
      if (endObj) {
        pts[pts.length - 1] = computeEdgePoint(endObj, pts[pts.length - 2]);
      }
    }

    return pts;
  }, [object.points, object.start_object_id, object.end_object_id, objects]);

  if (resolvedPoints.length < 2) return null;

  const flatPoints = resolvedPoints.flatMap((p) => [p.x, p.y]);
  const strokeColor = object.stroke_color || "#374151";
  const strokeWidth = object.stroke_width || 2;
  const hasStartArrow = object.start_arrow ?? false;
  const hasEndArrow = object.end_arrow ?? false;

  const midpoint = useMemo(() => {
    let sumX = 0;
    let sumY = 0;
    for (const p of resolvedPoints) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / resolvedPoints.length, y: sumY / resolvedPoints.length };
  }, [resolvedPoints]);

  // Midpoint handles (for adding bend points between segments)
  const segmentMidpoints = useMemo(() => {
    const mps: Array<{ x: number; y: number; segIndex: number }> = [];
    for (let i = 0; i < resolvedPoints.length - 1; i++) {
      mps.push({
        x: (resolvedPoints[i].x + resolvedPoints[i + 1].x) / 2,
        y: (resolvedPoints[i].y + resolvedPoints[i + 1].y) / 2,
        segIndex: i,
      });
    }
    return mps;
  }, [resolvedPoints]);

  const handleEndpointDrag = useCallback(
    (pointIndex: number, e: Konva.KonvaEventObject<DragEvent>) => {
      if (!onLineUpdate || !object.points) return;
      const node = e.target;
      const newPos = { x: node.x(), y: node.y() };
      const newPoints = [...object.points];
      newPoints[pointIndex] = newPos;
      const bounds = computeLineBounds(newPoints);

      // Check for snap
      const isFirst = pointIndex === 0;
      const isLast = pointIndex === object.points.length - 1;
      const snap = findSnapTarget(newPos, objects);

      const updates: Partial<BoardObject> = {
        points: newPoints,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      };

      if (isFirst) {
        updates.start_object_id = snap?.objectId ?? null;
      }
      if (isLast) {
        updates.end_object_id = snap?.objectId ?? null;
      }

      onLineUpdate(id, updates);
    },
    [id, object.points, objects, onLineUpdate]
  );

  const handleEndpointDragEnd = useCallback(
    (pointIndex: number, e: Konva.KonvaEventObject<DragEvent>) => {
      if (!onLineUpdateEnd || !object.points) return;
      const node = e.target;
      const newPos = { x: node.x(), y: node.y() };
      const newPoints = [...object.points];
      newPoints[pointIndex] = newPos;
      const bounds = computeLineBounds(newPoints);

      const isFirst = pointIndex === 0;
      const isLast = pointIndex === object.points.length - 1;
      const snap = findSnapTarget(newPos, objects);

      // Snap the position if close to a shape
      if (snap) {
        newPoints[pointIndex] = { x: snap.x, y: snap.y };
      }

      const finalBounds = computeLineBounds(newPoints);
      const updates: Partial<BoardObject> = {
        points: newPoints,
        x: finalBounds.x,
        y: finalBounds.y,
        width: finalBounds.width,
        height: finalBounds.height,
      };

      if (isFirst) {
        updates.start_object_id = snap?.objectId ?? null;
      }
      if (isLast) {
        updates.end_object_id = snap?.objectId ?? null;
      }

      onLineUpdateEnd(id, updates);
    },
    [id, object.points, objects, onLineUpdateEnd]
  );

  const handleMidpointClick = useCallback(
    (segIndex: number, pos: { x: number; y: number }) => {
      if (!onLineUpdateEnd || !object.points) return;
      const newPoints = [...object.points];
      newPoints.splice(segIndex + 1, 0, pos);
      const bounds = computeLineBounds(newPoints);
      onLineUpdateEnd(id, {
        points: newPoints,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });
    },
    [id, object.points, onLineUpdateEnd]
  );

  return (
    <Group
      listening={interactive}
      draggable={interactive && !!onLineUpdateEnd && !object.start_object_id && !object.end_object_id}
      onDragStart={handleBodyDragStart}
      onDragEnd={handleBodyDragEnd}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect?.(id, e.evt.shiftKey);
      }}
      onTap={() => onSelect?.(id)}
    >
      {/* Selection highlight */}
      {isSelected && (
        <Line
          points={flatPoints}
          stroke="#3b82f6"
          strokeWidth={strokeWidth + 6}
          opacity={0.3}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={0}
          listening={false}
        />
      )}

      {/* Main line / arrow */}
      {hasEndArrow || hasStartArrow ? (
        <Arrow
          points={flatPoints}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={strokeColor}
          pointerLength={10}
          pointerWidth={8}
          pointerAtBeginning={hasStartArrow}
          pointerAtEnding={hasEndArrow}
          hitStrokeWidth={20}
          lineCap="round"
          lineJoin="round"
        />
      ) : (
        <Line
          points={flatPoints}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          hitStrokeWidth={20}
          lineCap="round"
          lineJoin="round"
        />
      )}

      {/* Endpoint handles when selected — draggable */}
      {isSelected &&
        interactive &&
        resolvedPoints.map((p, i) => (
          <Circle
            key={`ep-${i}`}
            x={p.x}
            y={p.y}
            radius={5}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1.5}
            draggable={onLineUpdate != null}
            onDragMove={(e) => { e.cancelBubble = true; handleEndpointDrag(i, e); }}
            onDragEnd={(e) => { e.cancelBubble = true; handleEndpointDragEnd(i, e); }}
            onMouseDown={(e) => e.cancelBubble = true}
          />
        ))}

      {/* Midpoint handles (small diamonds) for adding bend points */}
      {isSelected &&
        interactive &&
        onLineUpdateEnd &&
        segmentMidpoints.map((mp) => (
          <Rect
            key={`mp-${mp.segIndex}`}
            x={mp.x - 4}
            y={mp.y - 4}
            width={8}
            height={8}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1}
            rotation={45}
            offsetX={0}
            offsetY={0}
            onClick={(e) => {
              e.cancelBubble = true;
              handleMidpointClick(mp.segIndex, { x: mp.x, y: mp.y });
            }}
          />
        ))}

      {/* Label at midpoint */}
      {object.label && (
        <>
          <Rect
            x={midpoint.x - (object.label.length * 4)}
            y={midpoint.y - 10}
            width={object.label.length * 8}
            height={20}
            fill="white"
            cornerRadius={3}
            opacity={0.9}
            listening={false}
          />
          <Text
            x={midpoint.x - (object.label.length * 4)}
            y={midpoint.y - 7}
            width={object.label.length * 8}
            text={object.label}
            fontSize={12}
            fill="#374151"
            align="center"
            listening={false}
          />
        </>
      )}
    </Group>
  );
});
