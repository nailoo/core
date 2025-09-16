import { expect, test } from "bun:test"
import { pushEdgesOfSchematicTraceToPreventOverlap } from "lib/components/primitive-components/Trace/trace-utils/push-edges-of-schematic-trace-to-prevent-overlap"

test("pushEdgesOfSchematicTraceToPreventOverlap keeps connection endpoints fixed", () => {
  const anchoredEdge = {
    from: { x: 0, y: 0 },
    to: { x: 1, y: 0 },
  }
  const unanchoredEdge = {
    from: { x: 2, y: 0 },
    to: { x: 4, y: 0 },
  }
  const edges = [anchoredEdge, unanchoredEdge]

  const otherEdges = [
    {
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
    },
    {
      from: { x: 2, y: 0 },
      to: { x: 4, y: 0 },
    },
  ]

  const mySourceTrace = {
    source_trace_id: "trace-1",
    connected_source_port_ids: ["port-1"],
    connected_source_net_ids: [],
    subcircuit_connectivity_map_key: "net-a",
  }

  const otherSourceTrace = {
    source_trace_id: "other-trace",
    connected_source_port_ids: [],
    connected_source_net_ids: [],
    subcircuit_connectivity_map_key: "net-b",
  }

  const schematicPorts = [
    {
      source_port_id: "port-1",
      center: { x: 0, y: 0 },
    },
  ]

  const db = {
    source_trace: {
      get: (id: string) => {
        if (id === "trace-1") return mySourceTrace
        if (id === "other-trace") return otherSourceTrace
        throw new Error(`Unexpected source_trace lookup: ${id}`)
      },
    },
    schematic_trace: {
      list: () => [
        { source_trace_id: "other-trace", edges: otherEdges },
      ],
    },
    schematic_port: {
      list: ({ source_port_id }: { source_port_id?: string } = {}) => {
        if (!source_port_id) return schematicPorts
        return schematicPorts.filter((port) => port.source_port_id === source_port_id)
      },
    },
    schematic_net_label: {
      list: () => [],
    },
  } as any

  pushEdgesOfSchematicTraceToPreventOverlap({
    edges,
    db,
    source_trace_id: "trace-1",
  })

  expect(anchoredEdge.from.y).toBeCloseTo(0)
  expect(anchoredEdge.to.y).toBeCloseTo(0)
  expect(unanchoredEdge.from.y).toBeCloseTo(0.1)
  expect(unanchoredEdge.to.y).toBeCloseTo(0.1)
})
