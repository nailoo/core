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

export const SCHEMATIC_PORT_TRACE_ANCHOR_OFFSET = 0

export const getSchematicPortTraceAnchor = ({
  center,
  facingDirection,
  offset = SCHEMATIC_PORT_TRACE_ANCHOR_OFFSET,
  componentCenter,
  componentSize,
}: {
  center: { x: number; y: number }
  facingDirection?: SchematicPort["facing_direction"] | null
  offset?: number
  componentCenter?: { x: number; y: number } | null
  componentSize?: { width: number; height: number } | null
}): { x: number; y: number } => {
  if (!facingDirection) return center
  const direction = directionVectors[facingDirection]
  if (!direction) return center
  const manualOffset = offset ?? 0

  let geometryOffset = 0
  if (componentCenter && componentSize) {
    const halfWidth = componentSize.width / 2
    const halfHeight = componentSize.height / 2

    if (Number.isFinite(halfWidth) && Number.isFinite(halfHeight)) {
      const axis =
        facingDirection === "left" || facingDirection === "right" ? "x" : "y"
      const directionComponent = axis === "x" ? direction.x : direction.y
      const halfExtent = axis === "x" ? halfWidth : halfHeight
      const componentCenterCoord =
        axis === "x" ? componentCenter.x : componentCenter.y
      const componentEdge =
        componentCenterCoord + halfExtent * directionComponent
      const portCoord = axis === "x" ? center.x : center.y
      const signedDistance =
        (componentEdge - portCoord) * directionComponent

      if (signedDistance > 0) {
        geometryOffset = signedDistance
      }
    }
  }

  const totalOffset = geometryOffset + manualOffset
  return {
    x: center.x + direction.x * totalOffset,
    y: center.y + direction.y * totalOffset,
  }
}
