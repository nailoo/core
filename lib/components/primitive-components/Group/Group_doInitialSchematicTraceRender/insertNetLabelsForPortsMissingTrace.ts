import type { SchematicTracePipelineSolver } from "@tscircuit/schematic-trace-solver"
import type { Group } from "lib/components"
import { computeSchematicNetLabelCenter } from "lib/utils/schematic/computeSchematicNetLabelCenter"
import { getEnteringEdgeFromDirection } from "lib/utils/schematic/getEnteringEdgeFromDirection"
import { getSchematicPortTraceAnchor } from "lib/utils/schematic/getSchematicPortTraceAnchor"

export const insertNetLabelsForPortsMissingTrace = ({
  allSourceAndSchematicPortIdsInScope,
  group,
  schPortIdToSourcePortId,
  sckToSourceNet: connKeyToNet,
  pinIdToSchematicPortId,
  schematicPortIdsWithPreExistingNetLabels,
}: {
  group: Group<any>
  allSourceAndSchematicPortIdsInScope: Set<string>
  schPortIdToSourcePortId: Map<string, string>
  sckToSourceNet: Map<string, any>
  pinIdToSchematicPortId: Map<string, string>
  schematicPortIdsWithPreExistingNetLabels: Set<string>
}) => {
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

  // Create net labels for ports connected only to a net (no trace connected)
  for (const schOrSrcPortId of Array.from(
    allSourceAndSchematicPortIdsInScope,
  )) {
    const schPort = db.schematic_port.get(schOrSrcPortId)
    if (!schPort) continue
    if (schPort.is_connected) continue
    const srcPortId = schPortIdToSourcePortId.get(schOrSrcPortId)
    if (!srcPortId) continue

    const sourcePort = db.source_port.get(srcPortId)
    const key = sourcePort?.subcircuit_connectivity_map_key
    if (!key) continue
    const sourceNet = connKeyToNet.get(key)
    if (!sourceNet) {
      continue
    }

    // Avoid duplicate labels at this port anchor position
    // Use a larger tolerance to account for placement discrepancy between
    // different net label algorithms (solver vs port-based placement)
    const componentGeometry = resolveComponentGeometry(
      schPort.schematic_component_id,
    )
    const anchor_position = getSchematicPortTraceAnchor({
      center: schPort.center,
      facingDirection: schPort.facing_direction,
      distanceFromComponentEdge: schPort.distance_from_component_edge,
      componentCenter: componentGeometry?.center ?? null,
      componentSize: componentGeometry?.size ?? null,
    })

    const existingAtPort = db.schematic_net_label.list().some((nl) => {
      const samePos =
        Math.abs(nl.anchor_position!.x - anchor_position.x) < 0.1 &&
        Math.abs(nl.anchor_position!.y - anchor_position.y) < 0.1
      if (!samePos) return false
      if (sourceNet.source_net_id && nl.source_net_id) {
        return nl.source_net_id === sourceNet.source_net_id
      }
      return nl.text === (sourceNet.name || key)
    })
    if (existingAtPort) continue

    const text = sourceNet.name || sourceNet.source_net_id || key
    const side =
      getEnteringEdgeFromDirection(
        (schPort.facing_direction as any) || "right",
      ) || "right"
    const center = computeSchematicNetLabelCenter({
      anchor_position,
      anchor_side: side as any,
      text,
    })
    // @ts-ignore
    db.schematic_net_label.insert({
      text,
      anchor_position,
      center,
      anchor_side: side as any,
      ...(sourceNet.source_net_id
        ? { source_net_id: sourceNet.source_net_id }
        : {}),
    })
  }
}
