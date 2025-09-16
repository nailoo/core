import type { SchSymbol } from "schematic-symbols"

/**
 * Default radius used by schematic-symbols for the circular port graphics.
 *
 * The symbols in @tscircuit/schematic-symbols render port circles with a 40 mil
 * diameter (0.02 schematic units). We reuse the same value when metadata doesn't
 * expose a dedicated trace anchor offset so traces terminate at the edge of the
 * drawn port instead of its centre.
 */
export const DEFAULT_SCHEMATIC_PORT_RADIUS = 0.02

type SymbolPort = SchSymbol["ports"][number] | null | undefined

/**
 * Attempt to read a trace anchor offset from a schematic symbol port
 * definition. The symbols currently published by @tscircuit/schematic-symbols
 * don't surface an explicit trace anchor field, but this helper centralises the
 * heuristics so future symbols can opt-in without modifying the anchor logic in
 * multiple places.
 */
export const getSymbolPortTraceAnchorOffset = (
  symbolPort: SymbolPort,
): number | undefined => {
  if (!symbolPort) return undefined

  const raw = (symbolPort as any)?.trace_anchor_offset ??
    (symbolPort as any)?.traceAnchorOffset ??
    (symbolPort as any)?.trace_connection_offset ??
    (symbolPort as any)?.traceConnectionOffset ??
    (symbolPort as any)?.port_radius ??
    (symbolPort as any)?.portRadius ??
    (symbolPort as any)?.radius

  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw
  }

  return undefined
}
