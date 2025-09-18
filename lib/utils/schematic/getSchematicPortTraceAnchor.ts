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

const resolveTraceAnchorOffset = ({
  offset,
  distanceFromComponentEdge,
  facingDirection,
  portCenter,
  componentCenter,
  componentSize,
}: {
  offset?: number
  distanceFromComponentEdge?: number | null
  facingDirection?: SchematicPort["facing_direction"] | null
  portCenter: { x: number; y: number }
  componentCenter?: { x: number; y: number } | null
  componentSize?: { width: number; height: number } | null
}) => {
  if (typeof offset === "number") return offset

  if (
    typeof distanceFromComponentEdge === "number" &&
    Number.isFinite(distanceFromComponentEdge)
  ) {
    return Math.abs(distanceFromComponentEdge)
  }

  if (!facingDirection || !componentCenter || !componentSize) return 0

  const halfWidth = componentSize.width / 2
  const halfHeight = componentSize.height / 2

  switch (facingDirection) {
    case "left":
      return Math.max(
        0,
        componentCenter.x - halfWidth - portCenter.x,
      )
    case "right":
      return Math.max(
        0,
        portCenter.x - (componentCenter.x + halfWidth),
      )
    case "up":
      return Math.max(
        0,
        portCenter.y - (componentCenter.y + halfHeight),
      )
    case "down":
      return Math.max(
        0,
        componentCenter.y - halfHeight - portCenter.y,
      )
    default:
      return 0
  }
}

export const getSchematicPortTraceAnchor = ({
  center,
  facingDirection,
  offset,
  distanceFromComponentEdge,
  componentCenter,
  componentSize,
}: {
  center: { x: number; y: number }
  facingDirection?: SchematicPort["facing_direction"] | null
  offset?: number
  distanceFromComponentEdge?: number | null
  componentCenter?: { x: number; y: number } | null
  componentSize?: { width: number; height: number } | null
}): { x: number; y: number } => {
  if (!facingDirection) return center
  const direction = directionVectors[facingDirection]
  if (!direction) return center
  const resolvedOffset = resolveTraceAnchorOffset({
    offset,
    distanceFromComponentEdge,
    facingDirection,
    portCenter: center,
    componentCenter,
    componentSize,
  })
  return {
    x: center.x - direction.x * resolvedOffset,
    y: center.y - direction.y * resolvedOffset,
  }
}
