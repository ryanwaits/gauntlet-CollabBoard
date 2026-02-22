"use client";

import { useWorkflowStore } from "@/lib/store/workflow-store";
import { NODE_DEFINITIONS } from "@/lib/workflow/node-definitions";
import { getPortPosition } from "@/components/nodes/node-port";
import { computeBezierPath } from "@/lib/workflow/edge-routing";
import { NODE_WIDTH } from "@/components/nodes/base-node";

export function EdgeLayer() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const selectedEdgeId = useWorkflowStore((s) => s.selectedEdgeId);
  const selectEdge = useWorkflowStore((s) => s.selectEdge);

  return (
    <g>
      {Array.from(edges.values()).map((edge) => {
        const sourceNode = nodes.get(edge.sourceNodeId);
        const targetNode = nodes.get(edge.targetNodeId);
        if (!sourceNode || !targetNode) return null;

        const sourceDef = NODE_DEFINITIONS[sourceNode.type];
        const targetDef = NODE_DEFINITIONS[targetNode.type];
        const sourcePort = sourceDef.ports.find((p) => p.id === edge.sourcePortId);
        const targetPort = targetDef.ports.find((p) => p.id === edge.targetPortId);
        if (!sourcePort || !targetPort) return null;

        const sourceOutputPorts = sourceDef.ports.filter((p) => p.direction === "output");
        const targetInputPorts = targetDef.ports.filter((p) => p.direction === "input");
        const sourceIdx = sourceOutputPorts.indexOf(sourcePort);
        const targetIdx = targetInputPorts.indexOf(targetPort);

        const sourcePortPos = getPortPosition(sourcePort, NODE_WIDTH, sourceIdx, sourceOutputPorts.length);
        const targetPortPos = getPortPosition(targetPort, NODE_WIDTH, targetIdx, targetInputPorts.length);

        const sx = sourceNode.position.x + sourcePortPos.cx;
        const sy = sourceNode.position.y + sourcePortPos.cy;
        const tx = targetNode.position.x + targetPortPos.cx;
        const ty = targetNode.position.y + targetPortPos.cy;

        const pathD = computeBezierPath(sx, sy, tx, ty);
        const isSelected = edge.id === selectedEdgeId;

        return (
          <g key={edge.id}>
            {/* Wider invisible hit area */}
            <path
              d={pathD}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              style={{ cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); selectEdge(edge.id); }}
            />
            <path
              d={pathD}
              fill="none"
              stroke={isSelected ? "#7b61ff" : "#d1d5db"}
              strokeWidth={isSelected ? 2.5 : 2}
              style={{ cursor: "pointer", transition: "stroke 0.15s" }}
              onClick={(e) => { e.stopPropagation(); selectEdge(edge.id); }}
            />
          </g>
        );
      })}
    </g>
  );
}
