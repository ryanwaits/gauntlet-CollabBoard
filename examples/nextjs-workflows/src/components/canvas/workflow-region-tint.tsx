"use client";

import { useState } from "react";
import type { BBox } from "@/lib/workflow/bounding-box";
import type { StreamStatus } from "@/types/workflow";

const PADDING = 40;

const STATUS_COLORS: Record<StreamStatus, { fill: string; stroke: string; strokeHover: string }> = {
  draft: { fill: "rgba(120,113,108,0.04)", stroke: "rgba(120,113,108,0.15)", strokeHover: "rgba(120,113,108,0.4)" },
  deploying: { fill: "rgba(202,138,4,0.06)", stroke: "rgba(202,138,4,0.2)", strokeHover: "rgba(202,138,4,0.45)" },
  active: { fill: "rgba(22,163,106,0.06)", stroke: "rgba(22,163,106,0.2)", strokeHover: "rgba(22,163,106,0.45)" },
  paused: { fill: "rgba(217,119,6,0.06)", stroke: "rgba(217,119,6,0.2)", strokeHover: "rgba(217,119,6,0.45)" },
  failed: { fill: "rgba(220,38,38,0.06)", stroke: "rgba(220,38,38,0.2)", strokeHover: "rgba(220,38,38,0.45)" },
};

interface WorkflowRegionTintProps {
  wfId: string;
  bbox: BBox;
  status: StreamStatus;
  onClick?: (e: React.MouseEvent) => void;
}

export function WorkflowRegionTint({ wfId, bbox, status, onClick }: WorkflowRegionTintProps) {
  const [hovered, setHovered] = useState(false);
  const colors = STATUS_COLORS[status];
  if (bbox.w === 0 && bbox.h === 0) return null;

  return (
    <rect
      data-workflow-region={wfId}
      x={bbox.x - PADDING}
      y={bbox.y - PADDING}
      width={bbox.w + PADDING * 2}
      height={bbox.h + PADDING * 2}
      rx={12}
      ry={12}
      fill={colors.fill}
      stroke={hovered ? colors.strokeHover : colors.stroke}
      strokeWidth={hovered ? 1.5 : 1}
      pointerEvents="visibleFill"
      style={{ cursor: hovered ? "grab" : "default", transition: "stroke 0.15s, stroke-width 0.15s" }}
      onClick={onClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    />
  );
}
