"use client";

import { Group, Rect, Text, Line } from "react-konva";
import type Konva from "konva";
import type { BoardObject } from "@/types/board";

interface BlockShapeProps {
  object: BoardObject;
  isSelected: boolean;
  onSelect?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  onDoubleClick?: () => void;
  interactive?: boolean;
  isEditing?: boolean;
}

const TITLE_HEIGHT = 40;
const PADDING = 16;
const MINI_STICKY_W = 80;
const MINI_STICKY_H = 60;
const MINI_GAP = 8;
const MINI_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff", "#fed7aa"];

export function BlockShape({
  object,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  onDoubleClick,
  interactive = true,
  isEditing = false,
}: BlockShapeProps) {
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragMove?.(e.target.x(), e.target.y());
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd?.(e.target.x(), e.target.y());
  };

  const title = object.text || "Untitled Block";
  const gridTop = TITLE_HEIGHT + PADDING;
  const cols = 2;
  const rows = 2;

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
          cornerRadius={14}
          dash={[6, 3]}
        />
      )}
      {/* Card background */}
      <Rect
        width={object.width}
        height={object.height}
        fill="#ffffff"
        stroke="#e5e7eb"
        strokeWidth={1}
        cornerRadius={12}
        shadowColor="rgba(0,0,0,0.08)"
        shadowBlur={12}
        shadowOffsetY={2}
      />
      {/* Title */}
      {!isEditing && (
        <Text
          x={PADDING}
          y={12}
          width={object.width - PADDING * 2}
          height={20}
          text={title}
          fontSize={16}
          fontStyle="bold"
          fontFamily="Inter, sans-serif"
          fill="#1f2937"
          ellipsis
        />
      )}
      {/* Divider */}
      <Line
        points={[PADDING, TITLE_HEIGHT, object.width - PADDING, TITLE_HEIGHT]}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
      {/* Mini-sticky grid */}
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => {
          const idx = row * cols + col;
          const x = PADDING + col * (MINI_STICKY_W + MINI_GAP);
          const y = gridTop + row * (MINI_STICKY_H + MINI_GAP);
          return (
            <Group key={idx}>
              <Rect
                x={x}
                y={y}
                width={MINI_STICKY_W}
                height={MINI_STICKY_H}
                fill={MINI_COLORS[idx % MINI_COLORS.length]}
                cornerRadius={4}
                shadowColor="rgba(0,0,0,0.06)"
                shadowBlur={2}
                shadowOffsetY={1}
              />
              <Text
                x={x + 6}
                y={y + 6}
                width={MINI_STICKY_W - 12}
                height={MINI_STICKY_H - 12}
                text={`Note ${idx + 1}`}
                fontSize={9}
                fontFamily="Inter, sans-serif"
                fill="#6b7280"
                wrap="word"
                ellipsis
              />
            </Group>
          );
        })
      )}
    </Group>
  );
}
