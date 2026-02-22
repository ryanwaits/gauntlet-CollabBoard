/**
 * Compute a horizontal cubic bezier path string from source to target.
 * Source exits right, target enters left.
 */
export function computeBezierPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
): string {
  const dx = Math.abs(targetX - sourceX);
  const offset = Math.max(50, dx * 0.4);

  const cp1x = sourceX + offset;
  const cp1y = sourceY;
  const cp2x = targetX - offset;
  const cp2y = targetY;

  return `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`;
}
