import { expect, it } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

it("applies ratsNestColor from nets to pcb traces", () => {
  const { project } = getTestFixture()

  project.add(
    <board width="10mm" height="10mm" autorouter="sequential-trace">
      <net name="N1" ratsNestColor="#112233" />
      <resistor name="R1" resistance="10k" footprint="0402" pcbX={-2} />
      <resistor name="R2" resistance="10k" footprint="0402" pcbX={2} />
      <trace from=".R1 > .pin1" to="net.N1" />
      <trace from=".R2 > .pin2" to="net.N1" />
    </board>,
  )

  project.render()

  const pcbTraces = project.db.pcb_trace.list()

  expect(pcbTraces.length).toBeGreaterThan(0)
  expect(new Set(pcbTraces.map((trace) => trace.rats_nest_color))).toEqual(
    new Set(["#112233"]),
  )

  const pcbNets = project.db.pcb_net?.list?.() ?? []
  expect(pcbNets.length).toBeGreaterThan(0)
  expect(
    pcbNets.some((net) => net.rats_nest_color === "#112233"),
  ).toBeTruthy()
})

it("applies ratsNestColor from trace props to pcb traces", () => {
  const { project } = getTestFixture()

  project.add(
    <board width="10mm" height="10mm" autorouter="sequential-trace">
      <resistor name="R1" resistance="10k" footprint="0402" pcbX={-2} />
      <resistor name="R2" resistance="10k" footprint="0402" pcbX={2} />
      <trace
        from=".R1 > .pin1"
        to=".R2 > .pin1"
        ratsNestColor="#abcdef"
      />
    </board>,
  )

  project.render()

  const pcbTraces = project.db.pcb_trace.list()

  expect(pcbTraces.length).toBe(1)
  expect(pcbTraces[0].rats_nest_color).toBe("#abcdef")
})

it("applies ratsNestColor from pinAttributes to pcb nets and traces", () => {
  const { project } = getTestFixture()

  project.add(
    <board width="20mm" height="20mm" autorouter="sequential-trace">
      <net name="PWR" />
      <chip
        name="U1"
        footprint="soic8"
        pcbX={-4}
        pcbY={0}
        pinLabels={{ 1: "PWR", 8: "GND" }}
        pinAttributes={{
          PWR: { ratsNestColor: "#00ff00" },
        }}
      />
      <resistor
        name="R1"
        resistance="10k"
        footprint="0402"
        pcbX={4}
        pcbY={0}
      />
      <trace from=".U1 .PWR" to="net.PWR" />
      <trace from=".R1 > .pin1" to="net.PWR" />
      <trace from=".U1 .GND" to="net.GND" />
      <trace from=".R1 > .pin2" to="net.GND" />
    </board>,
  )

  project.render()

  const pcbTraces = project.db.pcb_trace.list()
  expect(pcbTraces.length).toBeGreaterThan(0)
  expect(
    pcbTraces.some((trace) => trace.rats_nest_color === "#00ff00"),
  ).toBeTruthy()

  const pcbNets = project.db.pcb_net?.list?.() ?? []
  expect(pcbNets.length).toBeGreaterThan(0)
  expect(
    pcbNets.some((net) => net.rats_nest_color === "#00ff00"),
  ).toBeTruthy()
})
