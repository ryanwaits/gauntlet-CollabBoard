"use client";

import { useRef, useCallback, useEffect } from "react";
import { screenToCanvas } from "@/lib/canvas-utils";
import { useViewportStore } from "@/lib/store/viewport-store";
import { useBoardStore } from "@/lib/store/board-store";
import type { WorkflowMutationsApi } from "@/lib/sync/mutations-context";

export function useWorkflowDrag(
  svgElement: SVGSVGElement | null,
  mutations: WorkflowMutationsApi,
) {
  const dragRef = useRef<{
    wfId: string;
    startCanvasX: number;
    startCanvasY: number;
    nodeStarts: Map<string, { x: number; y: number }>;
  } | null>(null);
  const mutationsRef = useRef(mutations);
  mutationsRef.current = mutations;
  const svgElRef = useRef(svgElement);
  svgElRef.current = svgElement;

  const handlePointerDown = useCallback((e: PointerEvent) => {
    const target = e.target as SVGElement;
    const region = target.closest("[data-workflow-region]") as SVGElement | null;
    if (!region) return;
    const wfId = region.getAttribute("data-workflow-region");
    if (!wfId) return;

    // Don't intercept if the target is inside a foreignObject (badge, node, etc.)
    if (target.closest("foreignObject")) return;

    const svg = svgElRef.current;
    if (!svg) return;

    const { pos, scale } = useViewportStore.getState();
    const rect = svg.getBoundingClientRect();
    const canvasPos = screenToCanvas(e.clientX, e.clientY, rect, pos, scale);

    // Capture start positions for all nodes in this workflow
    const state = useBoardStore.getState();
    const nodeStarts = new Map<string, { x: number; y: number }>();
    for (const node of state.nodes.values()) {
      if (node.workflowId === wfId) {
        nodeStarts.set(node.id, { x: node.position.x, y: node.position.y });
      }
    }
    if (nodeStarts.size === 0) return;

    dragRef.current = {
      wfId,
      startCanvasX: canvasPos.x,
      startCanvasY: canvasPos.y,
      nodeStarts,
    };

    // Set grabbing cursor on the region
    region.style.cursor = "grabbing";

    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragRef.current) return;
    const svg = svgElRef.current;
    if (!svg) return;

    const { pos, scale } = useViewportStore.getState();
    const rect = svg.getBoundingClientRect();
    const canvasPos = screenToCanvas(e.clientX, e.clientY, rect, pos, scale);
    const dx = canvasPos.x - dragRef.current.startCanvasX;
    const dy = canvasPos.y - dragRef.current.startCanvasY;

    const updates: { id: string; position: { x: number; y: number } }[] = [];
    for (const [id, start] of dragRef.current.nodeStarts) {
      updates.push({ id, position: { x: start.x + dx, y: start.y + dy } });
    }
    mutationsRef.current.moveNodes(updates);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragRef.current) {
      // Reset cursor on the region element
      const region = document.querySelector(`[data-workflow-region="${dragRef.current.wfId}"]`) as SVGElement | null;
      if (region) region.style.cursor = "";
    }
    dragRef.current = null;
  }, []);

  useEffect(() => {
    if (!svgElement) return;
    svgElement.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      svgElement.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [svgElement, handlePointerDown, handlePointerMove, handlePointerUp]);
}
