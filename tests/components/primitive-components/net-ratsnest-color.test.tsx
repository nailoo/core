import { test, expect } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("ratsNestColor on net applies to pcb traces", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="20mm" height="10mm" autorouter="sequential-trace">
      <net name="SIG" ratsNestColor="blue" />
      <resistor
        name="R1"
        resistance="10k"
        footprint="0402"
        pcbX={-3}
        pcbY={0}
      />
      <resistor
        name="R2"
        resistance="10k"
        footprint="0402"
        pcbX={3}
        pcbY={0}
      />
      <trace from=".R1 > .pin1" to="net.SIG" />
      <trace from=".R2 > .pin1" to="net.SIG" />
    </board>,
  )

  await circuit.renderUntilSettled()

  const pcbTraces = circuit.db.pcb_trace.list()
  expect(pcbTraces.some((t) => t.rats_nest_color === "blue")).toBeTrue()
})

test("ratsNestColor from pinAttributes applies to pcb traces", async () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <board width="20mm" height="10mm" autorouter="sequential-trace">
      <chip
        name="U1"
        footprint="soic8"
        pcbX={-3}
        pinAttributes={{ pin1: { ratsNestColor: "orange" } }}
      />
      <resistor
        name="R1"
        resistance="10k"
        footprint="0402"
        pcbX={3}
      />
      <trace from=".U1 > .pin1" to=".R1 > .pin1" />
    </board>,
  )

  await circuit.renderUntilSettled()

  const pcbTraces = circuit.db.pcb_trace.list()
  expect(pcbTraces.some((t) => t.rats_nest_color === "orange")).toBeTrue()
})
