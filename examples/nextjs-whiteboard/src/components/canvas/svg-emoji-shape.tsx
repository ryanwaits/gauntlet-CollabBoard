"use client";

import { memo, useCallback, useRef } from "react";
import { useViewportStore } from "@/lib/store/viewport-store";
import type { BoardObject } from "@/types/board";

interface StampShapeProps {
  id: string;
  object: BoardObject;
  isSelected: boolean;
  onSelect?: (id: string, shiftKey?: boolean) => void;
  onDragMove?: (id: string, x: number, y: number) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
  interactive?: boolean;
  scale: number;
}

export const STAMP_SIZE = 64;

interface StampConfig {
  display: string;
  fontSize: number;
  fill?: string;
  fontWeight?: number;
  animated?: boolean;
}

export const STAMP_CONFIGS: Record<string, StampConfig> = {
  thumbsup: { display: "\ud83d\udc4d", fontSize: 42 },
  heart: { display: "\u2764\ufe0f", fontSize: 42, animated: true },
  fire: { display: "\ud83d\udd25", fontSize: 42 },
  star: { display: "\u2b50", fontSize: 42 },
  eyes: { display: "\ud83d\udc40", fontSize: 42 },
  laughing: { display: "\ud83d\ude02", fontSize: 42 },
  party: { display: "\ud83c\udf89", fontSize: 42 },
  plusone: { display: "+1", fontSize: 30, fill: "#7c3aed", fontWeight: 800 },
};

export const STAMP_TYPES = Object.keys(STAMP_CONFIGS);

export const SvgEmojiShape = memo(function SvgEmojiShape({
  id, object, isSelected, onSelect, onDragMove, onDragEnd, interactive = true,
}: StampShapeProps) {
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    scale: number;
  } | null>(null);

  const stampType = object.emoji_type || "thumbsup";
  const config = STAMP_CONFIGS[stampType] || STAMP_CONFIGS.thumbsup;
  const size = STAMP_SIZE;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect?.(id, e.shiftKey);
    if (!interactive || (!onDragMove && !onDragEnd)) return;

    const scale = useViewportStore.getState().scale;
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: object.x,
      startY: object.y,
      scale,
    };

    const handleMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.startClientX) / d.scale;
      const dy = (ev.clientY - d.startClientY) / d.scale;
      onDragMove?.(id, d.startX + dx, d.startY + dy);
    };

    const handleUp = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) { cleanup(); return; }
      const dx = (ev.clientX - d.startClientX) / d.scale;
      const dy = (ev.clientY - d.startClientY) / d.scale;
      onDragEnd?.(id, d.startX + dx, d.startY + dy);
      dragRef.current = null;
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }, [id, onSelect, interactive, onDragMove, onDragEnd, object.x, object.y]);

  // Text positioning within the 64x64 viewBox mapped to object position
  const cx = object.x + size / 2;
  const cy = object.y + size / 2;
  const textY = cy + config.fontSize * 0.33; // baseline offset

  return (
    <g>
      {/* Selection ring */}
      {isSelected && (
        <rect
          x={object.x - 3}
          y={object.y - 3}
          width={size + 6}
          height={size + 6}
          rx={6}
          ry={6}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 2"
          pointerEvents="none"
        />
      )}

      {/* Invisible hit area */}
      <rect
        x={object.x}
        y={object.y}
        width={size}
        height={size}
        fill="transparent"
        style={{ cursor: interactive ? "move" : "default" }}
        onPointerDown={handlePointerDown}
      />

      {/* Stamp: thick white outline sticker style */}
      <g pointerEvents="none">
        {/* White outline layer */}
        <text
          x={cx}
          y={textY}
          textAnchor="middle"
          fontSize={config.fontSize}
          fontWeight={config.fontWeight}
          stroke="white"
          strokeWidth={6}
          strokeLinejoin="round"
          paintOrder="stroke"
          fill="none"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.08))" }}
        >
          {config.animated && (
            <animateTransform
              attributeName="transform"
              type="scale"
              values="1;1.08;1"
              dur="1.2s"
              repeatCount="indefinite"
              additive="sum"
            />
          )}
          {config.display}
        </text>
        {/* Emoji fill layer */}
        <text
          x={cx}
          y={textY}
          textAnchor="middle"
          fontSize={config.fontSize}
          fontWeight={config.fontWeight}
          fill={config.fill || undefined}
        >
          {config.animated && (
            <animateTransform
              attributeName="transform"
              type="scale"
              values="1;1.08;1"
              dur="1.2s"
              repeatCount="indefinite"
              additive="sum"
            />
          )}
          {config.display}
        </text>
      </g>
    </g>
  );
});
