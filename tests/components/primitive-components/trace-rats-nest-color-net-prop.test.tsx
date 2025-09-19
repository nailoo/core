import { expect, it } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

it("applies ratsNestColor from nets to pcb traces", async () => {
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

  await expect(project).toMatchPcbSnapshot(import.meta.path)
})
