"use client";

import { useRef, useCallback, useState, useImperativeHandle, forwardRef, useEffect } from "react";
import { Stage, Layer, Shape, Rect } from "react-konva";
import type Konva from "konva";

export interface BoardCanvasHandle {
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface BoardCanvasProps {
  onStageMouseMove: (stagePos: { x: number; y: number }, scale: number, pointerPos: { x: number; y: number } | null) => void;
  onStageUpdate: (pos: { x: number; y: number }, scale: number) => void;
  onClickEmpty?: () => void;
  onCanvasClick?: (canvasX: number, canvasY: number) => void;
  mode?: "select" | "hand";
  children?: React.ReactNode;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.15;
const DOT_SPACING = 30;
const BOARD_WIDTH = 4000;
const BOARD_HEIGHT = 3000;
const BOARD_OFFSET_X = -BOARD_WIDTH / 2;
const BOARD_OFFSET_Y = -BOARD_HEIGHT / 2;

export const BoardCanvas = forwardRef<BoardCanvasHandle, BoardCanvasProps>(function BoardCanvas(
  { onStageMouseMove, onStageUpdate, onClickEmpty, onCanvasClick, mode = "select", children },
  ref
) {
  const stageRef = useRef<Konva.Stage>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const centerBoard = useCallback((w: number, h: number, scale: number) => {
    const pos = { x: w / 2, y: h / 2 };
    const stage = stageRef.current;
    if (stage) {
      stage.scale({ x: scale, y: scale });
      stage.position(pos);
    }
    return pos;
  }, []);

  const zoomBy = useCallback(
    (delta: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const oldScale = stage.scaleX();
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale + delta));
      // Zoom centered on viewport middle
      const center = { x: dimensions.width / 2, y: dimensions.height / 2 };
      const mousePointTo = {
        x: (center.x - stage.x()) / oldScale,
        y: (center.y - stage.y()) / oldScale,
      };
      stage.scale({ x: newScale, y: newScale });
      const newPos = {
        x: center.x - mousePointTo.x * newScale,
        y: center.y - mousePointTo.y * newScale,
      };
      stage.position(newPos);
      onStageUpdate(newPos, newScale);
    },
    [dimensions, onStageUpdate]
  );

  useImperativeHandle(ref, () => ({
    resetZoom: () => {
      const pos = centerBoard(dimensions.width, dimensions.height, 1);
      onStageUpdate(pos, 1);
    },
    zoomIn: () => zoomBy(ZOOM_STEP),
    zoomOut: () => zoomBy(-ZOOM_STEP),
  }), [dimensions, centerBoard, onStageUpdate, zoomBy]);

  // Measure container on mount
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      containerRef.current = node;
      const observer = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      });
      observer.observe(node);
      setDimensions({ width: node.clientWidth, height: node.clientHeight });
    }
  }, []);

  // Center board on initial render
  useEffect(() => {
    if (dimensions.width > 0 && !initialized.current) {
      initialized.current = true;
      const pos = centerBoard(dimensions.width, dimensions.height, 1);
      onStageUpdate(pos, 1);
    }
  }, [dimensions, centerBoard, onStageUpdate]);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition()!;

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = 1.05;
      let newScale = direction > 0 ? oldScale * factor : oldScale / factor;
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      stage.scale({ x: newScale, y: newScale });

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
      stage.position(newPos);

      onStageUpdate(newPos, newScale);
    },
    [onStageUpdate]
  );

  const handleDragEnd = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    onStageUpdate(stage.position(), stage.scaleX());
  }, [onStageUpdate]);

  const handleMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getRelativePointerPosition();
    onStageMouseMove(stage.position(), stage.scaleX(), pos);
  }, [onStageMouseMove]);

  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        const stage = stageRef.current;
        if (stage && onCanvasClick) {
          const pos = stage.getRelativePointerPosition();
          if (pos) {
            onCanvasClick(pos.x, pos.y);
            return;
          }
        }
        onClickEmpty?.();
      }
    },
    [onClickEmpty, onCanvasClick]
  );

  const handleDragMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    onStageUpdate(stage.position(), stage.scaleX());
  }, [onStageUpdate]);

  const isHand = mode === "hand";

  return (
    <div
      ref={measuredRef}
      className="h-full w-full"
      style={{ cursor: isHand ? "grab" : "default" }}
    >
      {dimensions.width > 0 && (
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          draggable={isHand}
          onWheel={handleWheel}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        >
          {/* Board boundary + dot grid */}
          <Layer listening={false}>
            <Rect
              x={BOARD_OFFSET_X}
              y={BOARD_OFFSET_Y}
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              fill="#ffffff"
              cornerRadius={8}
              shadowColor="rgba(0,0,0,0.12)"
              shadowBlur={40}
              shadowOffsetY={4}
            />
            <DotGrid stageRef={stageRef} />
            <Rect
              x={BOARD_OFFSET_X}
              y={BOARD_OFFSET_Y}
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              stroke="#e5e7eb"
              strokeWidth={2}
              cornerRadius={8}
              listening={false}
            />
          </Layer>

          {/* Content layer */}
          <Layer>{children}</Layer>
        </Stage>
      )}
    </div>
  );
});

function DotGrid({
  stageRef,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  return (
    <Shape
      sceneFunc={(context) => {
        const stage = stageRef.current;
        if (!stage) return;

        const scale = stage.scaleX();
        const ctx = context._context;

        const startX = Math.ceil(BOARD_OFFSET_X / DOT_SPACING) * DOT_SPACING;
        const startY = Math.ceil(BOARD_OFFSET_Y / DOT_SPACING) * DOT_SPACING;
        const endX = BOARD_OFFSET_X + BOARD_WIDTH;
        const endY = BOARD_OFFSET_Y + BOARD_HEIGHT;
        const radius = Math.max(1, 1.5 / scale);

        ctx.fillStyle = "#d1d5db";
        ctx.beginPath();
        for (let x = startX; x < endX; x += DOT_SPACING) {
          for (let y = startY; y < endY; y += DOT_SPACING) {
            ctx.moveTo(x + radius, y);
            ctx.arc(x, y, radius, 0, Math.PI * 2);
          }
        }
        ctx.fill();
      }}
    />
  );
}
