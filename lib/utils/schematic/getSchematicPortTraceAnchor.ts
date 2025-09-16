import type { SchematicPort } from "circuit-json"
import { DEFAULT_SCHEMATIC_PORT_RADIUS } from "./portGeometry"

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
  portRadius = DEFAULT_SCHEMATIC_PORT_RADIUS,
}: {
  center: { x: number; y: number }
  facingDirection?: SchematicPort["facing_direction"] | null
  portRadius?: number
}): { x: number; y: number } => {
  if (!facingDirection) return center
  const direction = directionVectors[facingDirection]
  if (!direction) return center
  const radius = typeof portRadius === "number" ? Math.max(portRadius, 0) : 0
  return {
    x: center.x - direction.x * radius,
    y: center.y - direction.y * radius,
  }
}
