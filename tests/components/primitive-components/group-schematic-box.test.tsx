import { expect, test } from "bun:test"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("group showAsSchematicBox renders a schematic component with mapped ports", () => {
  const { circuit } = getTestFixture()

  circuit.add(
    <group
      name="Shield"
      subcircuit
      showAsSchematicBox
      connections={{
        D1: "J1.pin1",
        D2: "J2.pin1",
      }}
      schPinArrangement={{
        leftSide: { direction: "top-to-bottom", pins: ["D1", "D2"] },
      }}
    >
      <pinheader name="J1" pinCount={1} />
      <pinheader name="J2" pinCount={1} />
    </group>,
  )

  circuit.render()

  const sourceGroup = circuit.db.source_group.list()[0]
  expect(sourceGroup?.show_as_schematic_box).toBe(true)

  const schematicGroup = circuit.db.schematic_group.list()[0]
  expect(schematicGroup?.show_as_schematic_box).toBe(true)

  const groupComponent = circuit.db.schematic_component
    .list()
    .find((component) => component.is_schematic_group)

  expect(groupComponent).toBeTruthy()
  expect(groupComponent).toMatchObject({
    source_group_id: sourceGroup?.source_group_id,
    is_schematic_group: true,
  })

  const groupPorts = circuit.db.schematic_port.list({
    schematic_component_id: groupComponent?.schematic_component_id,
  })

  expect(groupPorts.map((port) => port.display_pin_label)).toEqual(["D1", "D2"])

  const sourcePorts = circuit.db.source_port
    .list()
    .filter((port) => port.source_group_id === sourceGroup?.source_group_id)

  expect(sourcePorts.map((port) => port.name)).toEqual(["D1", "D2"])
})
