"use client";

import { useCallback } from "react";
import { createElement } from "react";
import { icons } from "lucide-react";
import { NODE_DEFINITIONS, CATEGORIES } from "@/lib/workflow/node-definitions";
import type { WorkflowNodeType } from "@/types/workflow";

export function NodePalette() {
  const handleDragStart = useCallback((type: WorkflowNodeType, e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", type);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const nodesByCategory = CATEGORIES.map((cat) => ({
    ...cat,
    nodes: Object.values(NODE_DEFINITIONS).filter((d) => d.category === cat.key),
  }));

  return (
    <div
      className="flex h-full w-56 flex-col border-r bg-white"
      style={{ borderColor: "#e5e7eb" }}
    >
      <div className="border-b px-4 py-3" style={{ borderColor: "#e5e7eb" }}>
        <h2 className="text-sm font-semibold text-gray-900">Nodes</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {nodesByCategory.map((cat) => (
          <div key={cat.key}>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">
              {cat.label}
            </p>
            <div className="space-y-1">
              {cat.nodes.map((def) => {
                const Icon = icons[def.icon as keyof typeof icons];
                return (
                  <div
                    key={def.type}
                    draggable
                    onDragStart={(e) => handleDragStart(def.type, e)}
                    className="flex cursor-grab items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors hover:bg-gray-50 active:cursor-grabbing"
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: def.color + "20" }}
                    >
                      {Icon && createElement(Icon, { size: 13, color: def.color })}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{def.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
