import type { WorkflowEdge } from "@/types/workflow";

/**
 * BFS reachability check: would adding sourceNodeId→targetNodeId create a cycle?
 * Returns true if targetNodeId can already reach sourceNodeId.
 */
export function wouldCreateCycle(
  edges: Map<string, WorkflowEdge>,
  sourceNodeId: string,
  targetNodeId: string,
): boolean {
  // If adding source→target, check if target can reach source (cycle)
  const adjacency = new Map<string, string[]>();
  for (const edge of edges.values()) {
    const list = adjacency.get(edge.sourceNodeId) ?? [];
    list.push(edge.targetNodeId);
    adjacency.set(edge.sourceNodeId, list);
  }

  // BFS from targetNodeId to see if we can reach sourceNodeId
  const visited = new Set<string>();
  const queue = [targetNodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === sourceNodeId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const neighbors = adjacency.get(current) ?? [];
    for (const n of neighbors) {
      if (!visited.has(n)) queue.push(n);
    }
  }
  return false;
}
