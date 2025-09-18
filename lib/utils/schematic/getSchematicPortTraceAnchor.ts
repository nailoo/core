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
  distanceFromComponentEdge?: SchematicPort["distance_from_component_edge"]
  offset?: number
}): { x: number; y: number } => {
  const effectiveOffset =
    offset ??
    (typeof distanceFromComponentEdge === "number"
      ? distanceFromComponentEdge
      : 0)

  if (!facingDirection || !effectiveOffset) return center
  const direction = directionVectors[facingDirection]
  if (!direction) return center
  return {
    x: center.x - direction.x * effectiveOffset,
    y: center.y - direction.y * effectiveOffset,
  }
}
