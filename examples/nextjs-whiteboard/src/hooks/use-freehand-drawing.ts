"use client";

import { useCallback, useRef, useState } from "react";
import { computeLineBounds } from "@/lib/geometry/edge-intersection";
import { rdpSimplify } from "@/lib/geometry/simplify";
import type { BoardObject } from "@/types/board";

interface FreehandDrawingState {
  isDrawing: boolean;
  points: Array<{ x: number; y: number }>;
}

const INITIAL_STATE: FreehandDrawingState = {
  isDrawing: false,
  points: [],
};

export function useFreehandDrawing() {
  const [state, setState] = useState<FreehandDrawingState>(INITIAL_STATE);
  const stateRef = useRef(state);

  const updateState = (next: FreehandDrawingState) => {
    stateRef.current = next;
    setState(next);
  };

  const startDrawing = useCallback((pos: { x: number; y: number }) => {
    updateState({ isDrawing: true, points: [pos] });
  }, []);

  const addPoint = useCallback((pos: { x: number; y: number }) => {
    const s = stateRef.current;
    if (!s.isDrawing) return;
    updateState({ ...s, points: [...s.points, pos] });
  }, []);

  const finalize = useCallback(
    (boardId: string, userId: string | null, displayName: string | undefined, zIndex: number): BoardObject | null => {
      const { points: rawPoints } = stateRef.current;
      if (rawPoints.length < 2) {
        updateState(INITIAL_STATE);
        return null;
      }

      const points = rdpSimplify(rawPoints, 1.5);
      if (points.length < 2) {
        updateState(INITIAL_STATE);
        return null;
      }

      const bounds = computeLineBounds(points);
      const obj: BoardObject = {
        id: crypto.randomUUID(),
        board_id: boardId,
        type: "drawing",
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        color: "transparent",
        text: "",
        z_index: zIndex,
        created_by: userId,
        created_by_name: displayName,
        updated_at: new Date().toISOString(),
        points,
        stroke_color: "#374151",
        stroke_width: 2,
      };

      updateState(INITIAL_STATE);
      return obj;
    },
    [],
  );

  const cancel = useCallback(() => {
    updateState(INITIAL_STATE);
  }, []);

  return { state, startDrawing, addPoint, finalize, cancel };
}
