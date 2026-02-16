"use client";

import { Rect, Group } from "react-konva";
import type Konva from "konva";
import type { BoardObject } from "@/types/board";

interface RectangleShapeProps {
  object: BoardObject;
  isSelected: boolean;
  onSelect?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  interactive?: boolean;
}

export function RectangleShape({
  object,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  interactive = true,
}: RectangleShapeProps) {
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onDragMove?.(node.x(), node.y());
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onDragEnd?.(node.x(), node.y());
  };

  return (
    <Group
      x={object.x}
      y={object.y}
      draggable={interactive}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {isSelected && (
        <Rect
          x={-3}
          y={-3}
          width={object.width + 6}
          height={object.height + 6}
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[6, 3]}
        />
      )}
      <Rect
        width={object.width}
        height={object.height}
        fill={object.color}
        stroke="#94a3b8"
        strokeWidth={1}
        cornerRadius={4}
        shadowColor="rgba(0,0,0,0.1)"
        shadowBlur={4}
        shadowOffsetY={1}
      />
    </Group>
  );
}
