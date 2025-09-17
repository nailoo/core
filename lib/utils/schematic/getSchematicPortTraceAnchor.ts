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

  let distanceFromComponentEdge: number | null = null
  if (componentCenter && componentSize) {
    const halfWidth = componentSize.width / 2
    const halfHeight = componentSize.height / 2

    if (Number.isFinite(halfWidth) && Number.isFinite(halfHeight)) {
      const top = componentCenter.y + halfHeight
      const bottom = componentCenter.y - halfHeight
      const left = componentCenter.x - halfWidth
      const right = componentCenter.x + halfWidth

      if (facingDirection === "left") {
        const distance = left - center.x
        if (distance > 0) distanceFromComponentEdge = distance
      } else if (facingDirection === "right") {
        const distance = center.x - right
        if (distance > 0) distanceFromComponentEdge = distance
      } else if (facingDirection === "up") {
        const distance = center.y - top
        if (distance > 0) distanceFromComponentEdge = distance
      } else if (facingDirection === "down") {
        const distance = bottom - center.y
        if (distance > 0) distanceFromComponentEdge = distance
      }
    }
  }

  const usableDistance =
    distanceFromComponentEdge !== null && distanceFromComponentEdge > 0
      ? distanceFromComponentEdge
      : null
  const totalOffset = usableDistance ?? manualOffset
  return {
    x: center.x - direction.x * totalOffset,
    y: center.y - direction.y * totalOffset,
  }
}
