import type { SchSymbol } from "schematic-symbols"
import { symbols } from "schematic-symbols"

/**
 * Schematic symbols render each port as a circular pad. Traces should meet the
 * outer edge of that circle rather than the stored port centre; by deriving the
 * radius (or explicit trace anchor offset) from the symbol metadata we can keep
 * the router aligned without hard-coded constants.
 */
type SymbolPort = SchSymbol["ports"][number] | null | undefined

const isPositiveFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0

const isReasonableRadius = (value: number): boolean => value <= 1

const maybeExtractRadiusFromKey = (
  key: string,
  rawValue: unknown,
): number | undefined => {
  if (!isPositiveFiniteNumber(rawValue)) return undefined

  const normalizedKey = key.toLowerCase()

  if (
    normalizedKey.includes("radius") ||
    normalizedKey === "r" ||
    normalizedKey.endsWith("_r") ||
    (normalizedKey.includes("trace") && normalizedKey.includes("offset"))
  ) {
    return isReasonableRadius(rawValue) ? rawValue : undefined
  }

  if (normalizedKey.includes("diameter")) {
    const radius = rawValue / 2
    return isPositiveFiniteNumber(radius) && isReasonableRadius(radius)
      ? radius
      : undefined
  }

  return undefined
}

const searchForRadius = (
  value: unknown,
  visited: Set<object> = new Set(),
): number | undefined => {
  if (value === null || value === undefined) return undefined
  if (typeof value !== "object") return undefined

  const asObject = value as object
  if (visited.has(asObject)) return undefined
  visited.add(asObject)

  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = searchForRadius(entry, visited)
      if (nested !== undefined) return nested
    }
    return undefined
  }

  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const direct = maybeExtractRadiusFromKey(key, nestedValue)
    if (direct !== undefined) return direct

    if (nestedValue && typeof nestedValue === "object") {
      const nested = searchForRadius(nestedValue, visited)
      if (nested !== undefined) return nested
    }
  }

  return undefined
}

const readTraceAnchorOffsetFromSymbolPort = (
  symbolPort: SymbolPort,
): number | undefined => {
  if (!symbolPort) return undefined

  const direct = searchForRadius(symbolPort)
  if (direct !== undefined) return direct

  const metadata = (symbolPort as any)?.metadata ?? (symbolPort as any)?.meta
  const metadataRadius = searchForRadius(metadata)
  if (metadataRadius !== undefined) return metadataRadius

  const graphicsRadius = searchForRadius(
    (symbolPort as any)?.graphics ??
      (symbolPort as any)?.shapes ??
      (symbolPort as any)?.elements ??
      (symbolPort as any)?.soup,
  )
  if (graphicsRadius !== undefined) return graphicsRadius

  return undefined
}

const deriveDefaultPortRadius = (): number => {
  for (const symbol of Object.values(
    symbols as Record<string, SchSymbol | undefined>,
  )) {
    if (!symbol) continue
    for (const port of symbol.ports ?? []) {
      const radius = readTraceAnchorOffsetFromSymbolPort(port)
      if (radius !== undefined) return radius
    }
  }
  return 0
}

/**
 * Default radius for schematic ports derived from the symbol library.
 *
 * We scan the bundled schematic symbols to locate the first port that exposes a
 * trace anchor offset or explicit radius metadata. This keeps routed traces
 * aligned with symbol artwork without hard-coding a fallback value.
 */
export const DEFAULT_SCHEMATIC_PORT_RADIUS = deriveDefaultPortRadius()

/**
 * Return the offset between a symbol port's centre point and the location where
 * schematic traces should terminate. Most symbols expose a radius or explicit
 * trace anchor value; when neither is available callers can fall back to the
 * derived library-wide default.
 */
export const getSymbolPortTraceAnchorOffset = (
  symbolPort: SymbolPort,
): number | undefined => readTraceAnchorOffsetFromSymbolPort(symbolPort)
