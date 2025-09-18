import { Group } from "../Group"
import { SchematicTracePipelineSolver } from "@tscircuit/schematic-trace-solver"
import { computeSchematicNetLabelCenter } from "lib/utils/schematic/computeSchematicNetLabelCenter"
import { getEnteringEdgeFromDirection } from "lib/utils/schematic/getEnteringEdgeFromDirection"
import { getSchematicPortTraceAnchor } from "lib/utils/schematic/getSchematicPortTraceAnchor"

export function insertNetLabelsForTracesExcludedFromRouting(args: {
  group: Group<any>
  solver: SchematicTracePipelineSolver
  displayLabelTraces: any[]
  pinIdToSchematicPortId: Map<string, string>
  schematicPortIdsWithPreExistingNetLabels: Set<string>
}) {
  const {
    group,
    displayLabelTraces,
    pinIdToSchematicPortId,
    schematicPortIdsWithPreExistingNetLabels,
  } = args
  const { db } = group.root!

  const componentGeometryCache = new Map<
    string,
    | {
        center: { x: number; y: number }
        size: { width: number; height: number }
      }
    | null
  >()
  const resolveComponentGeometry = (schematicComponentId?: string | null) => {
    if (!schematicComponentId) return undefined
    if (!componentGeometryCache.has(schematicComponentId)) {
      const component = db.schematic_component.get(schematicComponentId)
      componentGeometryCache.set(
        schematicComponentId,
        component?.center && component?.size
          ? {
              center: component.center,
              size: component.size,
            }
          : null,
      )
    }
    return componentGeometryCache.get(schematicComponentId) ?? undefined
  }

  for (const trace of displayLabelTraces as any[]) {
    const label = trace._parsedProps?.schDisplayLabel
    if (!label) continue
    try {
      const res = trace._findConnectedPorts?.()
      if (!res?.allPortsFound || !res.ports || res.ports.length < 1) continue
      const ports = res.ports.slice(0, 2)
      for (const port of ports) {
        const portCenter = port._getGlobalSchematicPositionAfterLayout()
        const schematicPort = port.schematic_port_id
          ? db.schematic_port.get(port.schematic_port_id)
          : undefined
        const componentGeometry = resolveComponentGeometry(
          schematicPort?.schematic_component_id,
        )
        const anchor_position = getSchematicPortTraceAnchor({
          center: portCenter,
          facingDirection: port.facingDirection,
          distanceFromComponentEdge:
            schematicPort?.distance_from_component_edge,
          componentCenter: componentGeometry?.center ?? null,
          componentSize: componentGeometry?.size ?? null,
        })
        const side =
          getEnteringEdgeFromDirection(port.facingDirection || "right") ||
          "right"
        const center = computeSchematicNetLabelCenter({
          anchor_position,
          anchor_side: side as any,
          text: label,
        })

        // // Deduplicate: if a label with the same text is already at this anchor position, skip
        const alreadyExists = db.schematic_net_label.list().some((nl) => {
          const ap = nl.anchor_position
          if (!ap) return false
          const samePos =
            Math.abs(ap.x - anchor_position.x) < 1e-6 &&
            Math.abs(ap.y - anchor_position.y) < 1e-6
          return samePos && nl.text === label
        })
        if (alreadyExists) continue

        // @ts-ignore
        db.schematic_net_label.insert({
          text: label,
          anchor_position,
          center,
          anchor_side: side as any,
          ...(trace.source_trace_id
            ? { source_trace_id: trace.source_trace_id }
            : {}),
        })
      }
    } catch {}
  }
}
