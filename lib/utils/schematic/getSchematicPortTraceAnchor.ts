import type { SchematicPort } from "circuit-json"

const directionVectors: Record<
  NonNullable<SchematicPort["facing_direction"]>,
  { x: number; y: number }
> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
}

export const getSchematicPortTraceAnchor = ({
  center,
  facingDirection,
  distanceFromComponentEdge,
  offset,
}: {
  center: { x: number; y: number }
  facingDirection?: SchematicPort["facing_direction"] | null
  distanceFromComponentEdge?: number | null
  offset?: number
}): { x: number; y: number } => {
  if (!facingDirection) return center
  const direction = directionVectors[facingDirection]
  if (!direction) return center
  const resolvedOffset =
    typeof offset === "number"
      ? offset
      : typeof distanceFromComponentEdge === "number"
        ? distanceFromComponentEdge
        : 0
  return {
    x: center.x - direction.x * resolvedOffset,
    y: center.y - direction.y * resolvedOffset,
  }
}
