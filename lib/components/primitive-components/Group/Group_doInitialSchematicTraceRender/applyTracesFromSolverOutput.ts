import { Group } from "../Group"
import { SchematicTracePipelineSolver } from "@tscircuit/schematic-trace-solver"
import type { SchematicTrace } from "circuit-json"
import { computeCrossings } from "./compute-crossings"
import { computeJunctions } from "./compute-junctions"
import Debug from "debug"
import { getDominantDirection } from "lib/utils/autorouting/getDominantDirection"
import { getStubEdges } from "lib/utils/schematic/getStubEdges"

const debug = Debug("Group_doInitialSchematicTraceRender")

export function applyTracesFromSolverOutput(args: {
  group: Group<any>
  solver: SchematicTracePipelineSolver
  pinIdToSchematicPortId: Map<string, string>
  userNetIdToSck: Map<string, string>
}) {
  const { group, solver, pinIdToSchematicPortId, userNetIdToSck } = args
  const { db } = group.root!

  // Use the overlap-corrected traces from the pipeline
  const correctedMap = solver.traceOverlapShiftSolver?.correctedTraceMap
  const pendingTraces: Array<{
    source_trace_id: string
    edges: SchematicTrace["edges"]
    subcircuit_connectivity_map_key?: string
  }> = []

  debug(
    `Traces inside SchematicTraceSolver output: ${Object.values(correctedMap ?? {}).length}`,
  )

  const pointsAreEqual = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    tolerance = 0.001,
  ) => Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance

  for (const solvedTracePath of Object.values(correctedMap ?? {})) {
    const points = solvedTracePath?.tracePath as Array<{ x: number; y: number }>
    if (!Array.isArray(points) || points.length < 2) {
      debug(
        `Skipping trace ${solvedTracePath?.pinIds.join(",")} because it has less than 2 points`,
      )
      continue
    }

    const edges: SchematicTrace["edges"] = []
    for (let i = 0; i < points.length - 1; i++) {
      edges.push({
        from: { x: points[i]!.x, y: points[i]!.y },
        to: { x: points[i + 1]!.x, y: points[i + 1]!.y },
      })
    }

    const portInfos = Array.isArray(solvedTracePath?.pins)
      ? solvedTracePath.pins
          .map((pin: any) => {
            const schematicPortId = pinIdToSchematicPortId.get(pin?.pinId!)
            if (!schematicPortId) return null
            const port = db.schematic_port.get(schematicPortId)
            if (!port) return null
            return {
              schematic_port_id: schematicPortId,
              position: { x: port.center.x, y: port.center.y },
            }
          })
          .filter((info): info is { schematic_port_id: string; position: { x: number; y: number } } =>
            info !== null,
          )
      : []

    const findClosestPort = (
      point: { x: number; y: number },
      excludePortId?: string,
    ) => {
      let closest: { schematic_port_id: string; position: { x: number; y: number } } | null = null
      let minDistSq = Infinity
      for (const info of portInfos) {
        if (excludePortId && info.schematic_port_id === excludePortId) continue
        const dx = info.position.x - point.x
        const dy = info.position.y - point.y
        const distSq = dx * dx + dy * dy
        if (distSq < minDistSq) {
          minDistSq = distSq
          closest = info
        }
      }
      return closest
    }

    const firstEdge = edges[0]
    const lastEdge = edges[edges.length - 1]
    const startPort = firstEdge ? findClosestPort(firstEdge.from) : null
    const endPort = lastEdge
      ? findClosestPort(lastEdge.to, startPort?.schematic_port_id)
      : null

    if (firstEdge && startPort && !pointsAreEqual(firstEdge.from, startPort.position)) {
      const stubEdges = getStubEdges({
        firstEdge,
        firstEdgePort: { position: startPort.position },
        firstDominantDirection: getDominantDirection(firstEdge),
      })
      if (stubEdges.length > 0) {
        edges.unshift(...stubEdges)
      }
    }

    if (lastEdge && endPort && !pointsAreEqual(lastEdge.to, endPort.position)) {
      const stubEdges = getStubEdges({
        lastEdge,
        lastEdgePort: { position: endPort.position },
        lastDominantDirection: getDominantDirection(lastEdge),
      })
      if (stubEdges.length > 0) {
        edges.push(...stubEdges)
      }
    }

    // Try to associate with an existing source_trace_id when this is a direct connection
    let source_trace_id: string | null = null
    let subcircuit_connectivity_map_key: string | undefined
    if (
      Array.isArray(solvedTracePath?.pins) &&
      solvedTracePath.pins.length === 2
    ) {
      const pA = pinIdToSchematicPortId.get(solvedTracePath.pins[0]?.pinId!)
      const pB = pinIdToSchematicPortId.get(solvedTracePath.pins[1]?.pinId!)
      if (pA && pB) {
        // Mark ports as connected on schematic
        for (const schPid of [pA, pB]) {
          const existing = db.schematic_port.get(schPid)
          if (existing) db.schematic_port.update(schPid, { is_connected: true })
        }

        subcircuit_connectivity_map_key = userNetIdToSck.get(
          String(solvedTracePath.userNetId),
        )
      }
    }

    if (!source_trace_id) {
      source_trace_id = `solver_${solvedTracePath?.mspPairId!}`
      subcircuit_connectivity_map_key = userNetIdToSck.get(
        String(solvedTracePath.userNetId),
      )
    }

    pendingTraces.push({
      source_trace_id,
      edges,
      subcircuit_connectivity_map_key,
    })
  }

  debug(
    `Applying ${pendingTraces.length} traces from SchematicTraceSolver output`,
  )

  // Compute crossings and junctions without relying on DB lookups
  const withCrossings = computeCrossings(
    pendingTraces.map((t) => ({
      source_trace_id: t.source_trace_id,
      edges: t.edges,
    })),
  )
  const junctionsById = computeJunctions(withCrossings)

  for (const t of withCrossings) {
    db.schematic_trace.insert({
      source_trace_id: t.source_trace_id,
      edges: t.edges,
      junctions: junctionsById[t.source_trace_id] ?? [],
      subcircuit_connectivity_map_key: pendingTraces.find(
        (p) => p.source_trace_id === t.source_trace_id,
      )?.subcircuit_connectivity_map_key,
    })
  }
}
