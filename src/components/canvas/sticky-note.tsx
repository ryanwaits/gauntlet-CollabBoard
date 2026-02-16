"use client";

import { Group, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { BoardObject } from "@/types/board";

interface StickyNoteProps {
  object: BoardObject;
  isSelected: boolean;
  onSelect?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  onDoubleClick?: () => void;
  interactive?: boolean;
  isEditing?: boolean;
}

const PADDING = 12;

export function StickyNote({
  object,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  onDoubleClick,
  interactive = true,
  isEditing = false,
}: StickyNoteProps) {
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
          strokeWidth={2}
          cornerRadius={10}
          dash={[6, 3]}
        />
      )}
      {/* Shadow */}
      <Rect
        width={object.width}
        height={object.height}
        fill={object.color}
        cornerRadius={8}
        shadowColor="rgba(0,0,0,0.15)"
        shadowBlur={8}
        shadowOffsetY={2}
      />
      {/* Text */}
      {!isEditing && (
        <Text
          x={PADDING}
          y={PADDING}
          width={object.width - PADDING * 2}
          height={object.height - PADDING * 2}
          text={object.text || "Click to edit"}
          fontSize={14}
          fontFamily="Inter, sans-serif"
          fill={object.text ? "#1f2937" : "#9ca3af"}
          verticalAlign="middle"
          align="center"
          wrap="word"
          ellipsis
        />
      )}
    </Group>
  );
}
