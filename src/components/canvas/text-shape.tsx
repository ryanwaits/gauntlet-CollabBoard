"use client";

import { Group, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { BoardObject } from "@/types/board";

interface TextShapeProps {
  object: BoardObject;
  isSelected: boolean;
  onSelect?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  onDoubleClick?: () => void;
  interactive?: boolean;
  isEditing?: boolean;
}

export function TextShape({
  object,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  onDoubleClick,
  interactive = true,
  isEditing = false,
}: TextShapeProps) {
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragMove?.(e.target.x(), e.target.y());
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd?.(e.target.x(), e.target.y());
  };

  return (
    <Group
      x={object.x}
      y={object.y}
      draggable={interactive}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {/* Selection ring */}
      {isSelected && (
        <Rect
          x={-3}
          y={-3}
          width={object.width + 6}
          height={object.height + 6}
          stroke="#3b82f6"
          strokeWidth={1.5}
          cornerRadius={4}
          dash={[4, 3]}
        />
      )}
      {/* Text */}
      {!isEditing && (
        <Text
          width={object.width}
          height={object.height}
          text={object.text || "Type something..."}
          fontSize={16}
          fontFamily="Inter, sans-serif"
          fill={object.text ? "#1f2937" : "#9ca3af"}
          verticalAlign="middle"
          wrap="word"
        />
      )}
    </Group>
  );
}
