"use client";

import { memo, useRef, useCallback } from "react";
import { Circle, Line } from "react-konva";
import type Konva from "konva";

interface RotationHandleProps {
  width: number;
  height: number;
  scale: number;
  rotation: number;
  onRotate: (rotation: number) => void;
  onRotateEnd: (rotation: number) => void;
  visible: boolean;
}

const HANDLE_DISTANCE = 25;
const SNAP_INCREMENT = 15;

export const RotationHandle = memo(function RotationHandle({
  width,
  height,
  scale,
  rotation,
  onRotate,
  onRotateEnd,
  visible,
}: RotationHandleProps) {
  const dragRef = useRef<{
    centerX: number;
    centerY: number;
    stageScale: number;
  } | null>(null);

  const onRotateRef = useRef(onRotate);
  onRotateRef.current = onRotate;
  const onRotateEndRef = useRef(onRotateEnd);
  onRotateEndRef.current = onRotateEnd;

  const computeAngle = useCallback((clientX: number, clientY: number, shiftKey: boolean) => {
    const d = dragRef.current;
    if (!d) return rotation;
    const dx = clientX - d.centerX;
    const dy = clientY - d.centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    // Normalize to 0-360
    angle = ((angle % 360) + 360) % 360;
    if (shiftKey) {
      angle = Math.round(angle / SNAP_INCREMENT) * SNAP_INCREMENT;
    }
    return angle;
  }, [rotation]);

  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    onRotateRef.current(computeAngle(e.clientX, e.clientY, e.shiftKey));
  }, [computeAngle]);

  const handleWindowMouseUp = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    onRotateEndRef.current(computeAngle(e.clientX, e.clientY, e.shiftKey));
    dragRef.current = null;
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [computeAngle, handleWindowMouseMove]);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    const stage = e.target.getStage();
    if (!stage) return;

    // Get shape center in screen coordinates
    // The group is positioned at (obj.x + w/2, obj.y + h/2) in stage space
    // We need to convert that to screen coordinates
    const stageBox = stage.container().getBoundingClientRect();
    const stageScale = stage.scaleX();
    const stagePos = stage.position();

    // The handle's parent group has its x/y at shape center in stage coords.
    // Find the group (parent of the handle).
    const group = e.target.getParent();
    if (!group) return;
    const absPos = group.getAbsolutePosition();

    dragRef.current = {
      centerX: stageBox.left + absPos.x,
      centerY: stageBox.top + absPos.y,
      stageScale,
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
  }, [handleWindowMouseMove, handleWindowMouseUp]);

  if (!visible) return null;

  const handleDist = HANDLE_DISTANCE / scale;
  const handleRadius = 4 / scale;

  return (
    <>
      {/* Stem line from top-center to handle */}
      <Line
        points={[width / 2, 0, width / 2, -handleDist]}
        stroke="#3b82f6"
        strokeWidth={1 / scale}
        listening={false}
      />
      {/* Rotation handle circle */}
      <Circle
        x={width / 2}
        y={-handleDist}
        radius={handleRadius}
        fill="white"
        stroke="#3b82f6"
        strokeWidth={1.5 / scale}
        onMouseDown={handleMouseDown}
      />
    </>
  );
});
