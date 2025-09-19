import { expect, it } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

it("applies ratsNestColor from trace props to pcb traces", async () => {
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

  await expect(project).toMatchPcbSnapshot(import.meta.path)
})
