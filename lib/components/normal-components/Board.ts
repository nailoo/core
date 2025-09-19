import { boardProps } from "@tscircuit/props"
import type { NinePointAnchor } from "circuit-json"
import { type Matrix, identity } from "transformation-matrix"
import { Group } from "../primitive-components/Group/Group"
import {
  checkEachPcbPortConnectedToPcbTraces,
  checkEachPcbTraceNonOverlapping,
  checkPcbComponentsOutOfBoard,
} from "@tscircuit/checks"
import type { RenderPhase } from "../base-components/Renderable"
import { getDescendantSubcircuitIds } from "../../utils/autorouting/getAncestorSubcircuitIds"

const getRoundedRectOutline = (
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.min(radius, width / 2, height / 2)
  const segments = Math.max(1, Math.ceil((Math.PI / 2) * r))
  const step = Math.PI / 2 / segments
  const w2 = width / 2
  const h2 = height / 2

  const outline: { x: number; y: number }[] = []

  outline.push({ x: -w2 + r, y: -h2 })
  outline.push({ x: w2 - r, y: -h2 })
  for (let i = 1; i <= segments; i++) {
    const theta = -Math.PI / 2 + i * step
    outline.push({
      x: w2 - r + r * Math.cos(theta),
      y: -h2 + r + r * Math.sin(theta),
    })
  }

  outline.push({ x: w2, y: h2 - r })
  for (let i = 1; i <= segments; i++) {
    const theta = 0 + i * step
    outline.push({
      x: w2 - r + r * Math.cos(theta),
      y: h2 - r + r * Math.sin(theta),
    })
  }

  outline.push({ x: -w2 + r, y: h2 })
  for (let i = 1; i <= segments; i++) {
    const theta = Math.PI / 2 + i * step
    outline.push({
      x: -w2 + r + r * Math.cos(theta),
      y: h2 - r + r * Math.sin(theta),
    })
  }

  outline.push({ x: -w2, y: -h2 + r })
  for (let i = 1; i <= segments; i++) {
    const theta = Math.PI + i * step
    outline.push({
      x: -w2 + r + r * Math.cos(theta),
      y: -h2 + r + r * Math.sin(theta),
    })
  }

  return outline
}

const validBoardAnchorAlignments: NinePointAnchor[] = [
  "top_left",
  "top_center",
  "top_right",
  "center_left",
  "center",
  "center_right",
  "bottom_left",
  "bottom_center",
  "bottom_right",
]

const getAnchorOffset = (
  alignment: NinePointAnchor,
  width: number,
  height: number,
) => {
  const horizontalMultiplier = alignment.includes("left")
    ? -1
    : alignment.includes("right")
      ? 1
      : 0
  const verticalMultiplier = alignment.includes("top")
    ? 1
    : alignment.includes("bottom")
      ? -1
      : 0

  return {
    dx: (width / 2) * horizontalMultiplier,
    dy: (height / 2) * verticalMultiplier,
  }
}

export class Board extends Group<typeof boardProps> {
  pcb_board_id: string | null = null
  _drcChecksComplete = false
  _connectedSchematicPortPairs = new Set<string>()

  get isSubcircuit() {
    return true
  }

  get isGroup() {
    return true
  }

  get config() {
    return {
      componentName: "Board",
      zodProps: boardProps,
    }
  }

  get boardThickness() {
    const { _parsedProps: props } = this
    return 1.4 // TODO use prop
  }

  private _getBoardAnchorAlignment(): NinePointAnchor {
    const alignment = (this._parsedProps as any).boardAnchorAlignment
    if (validBoardAnchorAlignments.includes(alignment)) {
      return alignment
    }
    return "center"
  }

  private _getBoardAnchorPosition(
    fallback: { x: number; y: number },
  ): { x: number; y: number } {
    const props = this._parsedProps as any
    const offsetX = props.outlineOffsetX ?? 0
    const offsetY = props.outlineOffsetY ?? 0

    const maybeNumber = (value: unknown, fallbackValue: number) =>
      typeof value === "number" && !Number.isNaN(value)
        ? value
        : fallbackValue

    const getBaseAnchorPosition = () => {
      if (props.boardAnchorPosition && typeof props.boardAnchorPosition === "object") {
        return {
          x: maybeNumber(props.boardAnchorPosition.x, fallback.x),
          y: maybeNumber(props.boardAnchorPosition.y, fallback.y),
        }
      }

      if (props.boardAnchorX != null || props.boardAnchorY != null) {
        return {
          x: maybeNumber(props.boardAnchorX, fallback.x),
          y: maybeNumber(props.boardAnchorY, fallback.y),
        }
      }

      if (props.pcbX != null || props.pcbY != null) {
        return {
          x: maybeNumber(props.pcbX, fallback.x),
          y: maybeNumber(props.pcbY, fallback.y),
        }
      }

      return fallback
    }

    const baseAnchor = getBaseAnchorPosition()

    return {
      x: baseAnchor.x + offsetX,
      y: baseAnchor.y + offsetY,
    }
  }

  private _calculateCenterFromAnchor(
    anchorPosition: { x: number; y: number },
    alignment: NinePointAnchor,
    width: number,
    height: number,
  ) {
    const { dx, dy } = getAnchorOffset(alignment, width, height)
    return {
      x: anchorPosition.x - dx,
      y: anchorPosition.y - dy,
    }
  }

  /**
   * Get all available layers for the board
   */
  get allLayers() {
    const layerCount = this._parsedProps.layers ?? 2
    if (layerCount === 4) {
      return ["top", "bottom", "inner1", "inner2"] as const
    }
    return ["top", "bottom"] as const
  }

  _getSubcircuitLayerCount(): number {
    return this._parsedProps.layers ?? 2
  }

  doInitialPcbBoardAutoSize(): void {
    if (this.root?.pcbDisabled) return
    if (!this.pcb_board_id) return
    const { db } = this.root!
    const { _parsedProps: props } = this

    // Skip if width and height are explicitly provided
    if (props.width && props.height) return

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    // Get all PCB components and groups from the database
    const descendantIds = getDescendantSubcircuitIds(db, this.subcircuit_id!)
    const allowedSubcircuitIds = new Set([this.subcircuit_id, ...descendantIds])

    const allPcbComponents = db.pcb_component
      .list()
      .filter(
        (c) => c.subcircuit_id && allowedSubcircuitIds.has(c.subcircuit_id),
      )
    const allPcbGroups = db.pcb_group
      .list()
      .filter(
        (g) => g.subcircuit_id && allowedSubcircuitIds.has(g.subcircuit_id),
      )

    let hasComponents = false

    const updateBounds = (
      center: { x: number; y: number },
      width: number,
      height: number,
    ) => {
      if (width === 0 || height === 0) return
      hasComponents = true
      minX = Math.min(minX, center.x - width / 2)
      minY = Math.min(minY, center.y - height / 2)
      maxX = Math.max(maxX, center.x + width / 2)
      maxY = Math.max(maxY, center.y + height / 2)
    }

    // Process all PCB components
    for (const pcbComponent of allPcbComponents) {
      updateBounds(pcbComponent.center, pcbComponent.width, pcbComponent.height)
    }

    // Process all PCB groups (for nested subcircuits)
    for (const pcbGroup of allPcbGroups) {
      updateBounds(pcbGroup.center, pcbGroup.width, pcbGroup.height)
    }

    // Add padding around components
    const padding = 2

    // Use dimensions of 0,0 when no components are found
    const computedWidth = hasComponents ? maxX - minX + padding * 2 : 0
    const computedHeight = hasComponents ? maxY - minY + padding * 2 : 0

    // Center the board around the components or use (0,0) for empty boards
    const finalWidth = props.width ?? computedWidth
    const finalHeight = props.height ?? computedHeight

    const fallbackAnchorBase = hasComponents
      ? {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
        }
      : {
          x: props.pcbX ?? 0,
          y: props.pcbY ?? 0,
        }

    const anchorAlignment = this._getBoardAnchorAlignment()
    const anchorPosition = this._getBoardAnchorPosition(fallbackAnchorBase)
    const center = this._calculateCenterFromAnchor(
      anchorPosition,
      anchorAlignment,
      finalWidth,
      finalHeight,
    )

    let outline = props.outline
    if (
      !outline &&
      props.borderRadius != null &&
      finalWidth > 0 &&
      finalHeight > 0
    ) {
      outline = getRoundedRectOutline(
        finalWidth,
        finalHeight,
        props.borderRadius,
      )
    }

    const update: Record<string, unknown> = {
      width: finalWidth,
      height: finalHeight,
      center,
      anchor_alignment: anchorAlignment,
      anchor_position: anchorPosition,
    }

    if (outline) {
      update.outline = outline.map((point) => ({
        x: point.x + (props.outlineOffsetX ?? 0),
        y: point.y + (props.outlineOffsetY ?? 0),
      }))
    }

    db.pcb_board.update(this.pcb_board_id, update)
  }

  // Recompute autosize after child components update (e.g., async footprints)
  updatePcbBoardAutoSize(): void {
    // Reuse the same logic as initial autosize; it is idempotent
    this.doInitialPcbBoardAutoSize()
  }

  /**
   * Update the board information silkscreen text if platform config is set and
   * the project name, version, or url is set.
   */
  private _addBoardInformationToSilkscreen() {
    const platform = this.root?.platform
    if (!platform?.printBoardInformationToSilkscreen) return

    const pcbBoard = this.root!.db.pcb_board.get(this.pcb_board_id!)
    if (!pcbBoard) return

    const boardInformation: string[] = []
    if (platform.projectName) boardInformation.push(platform.projectName)
    if (platform.version) boardInformation.push(`v${platform.version}`)
    if (platform.url) boardInformation.push(platform.url)
    if (boardInformation.length === 0) return

    const text = boardInformation.join("\n")
    const marginX = 0.25
    const marginY = 1
    const position = {
      x: pcbBoard.center.x + pcbBoard.width / 2 - marginX,
      y: pcbBoard.center.y - pcbBoard.height / 2 + marginY,
    }

    this.root!.db.pcb_silkscreen_text.insert({
      pcb_component_id: this.pcb_board_id!,
      layer: "top",
      font: "tscircuit2024",
      font_size: 0.45,
      text,
      ccw_rotation: 0,
      anchor_alignment: "bottom_right",
      anchor_position: position,
    })
  }

  doInitialPcbComponentRender(): void {
    if (this.root?.pcbDisabled) return
    const { db } = this.root!
    const { _parsedProps: props } = this

    // Initialize with minimal dimensions if not provided
    // They will be updated in PcbBoardAutoSize phase
    let computedWidth = props.width ?? 0
    let computedHeight = props.height ?? 0
    let fallbackAnchorBase = {
      x: props.pcbX ?? 0,
      y: props.pcbY ?? 0,
    }

    // Compute width and height from outline if not provided
    if (props.outline) {
      const xValues = props.outline.map((point) => point.x)
      const yValues = props.outline.map((point) => point.y)

      const minX = Math.min(...xValues)
      const maxX = Math.max(...xValues)
      const minY = Math.min(...yValues)
      const maxY = Math.max(...yValues)

      computedWidth = maxX - minX
      computedHeight = maxY - minY
      fallbackAnchorBase = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
      }
    }

    const anchorAlignment = this._getBoardAnchorAlignment()
    const anchorPosition = this._getBoardAnchorPosition(fallbackAnchorBase)
    const center = this._calculateCenterFromAnchor(
      anchorPosition,
      anchorAlignment,
      computedWidth,
      computedHeight,
    )

    let outline = props.outline
    if (
      !outline &&
      props.borderRadius != null &&
      computedWidth > 0 &&
      computedHeight > 0
    ) {
      outline = getRoundedRectOutline(
        computedWidth,
        computedHeight,
        props.borderRadius,
      )
    }

    const pcb_board = db.pcb_board.insert({
      center,

      thickness: this.boardThickness,
      num_layers: this.allLayers.length,

      width: computedWidth!,
      height: computedHeight!,
      outline: outline?.map((point) => ({
        x: point.x + (props.outlineOffsetX ?? 0),
        y: point.y + (props.outlineOffsetY ?? 0),
      })),
      material: props.material,
      anchor_alignment: anchorAlignment,
      anchor_position: anchorPosition,
    })

    this.pcb_board_id = pcb_board.pcb_board_id!

    // Add board information silkscreen text
    this._addBoardInformationToSilkscreen()
  }

  removePcbComponentRender(): void {
    const { db } = this.root!
    if (!this.pcb_board_id) return
    db.pcb_board.delete(this.pcb_board_id!)
    this.pcb_board_id = null
  }

  _computePcbGlobalTransformBeforeLayout(): Matrix {
    return identity()
  }

  doInitialPcbDesignRuleChecks() {
    if (this.root?.pcbDisabled) return
    if (this.getInheritedProperty("routingDisabled")) return

    super.doInitialPcbDesignRuleChecks()
  }

  updatePcbDesignRuleChecks() {
    if (this.root?.pcbDisabled) return
    if (this.getInheritedProperty("routingDisabled")) return
    const { db } = this.root!

    if (!this._areChildSubcircuitsRouted()) return

    // Only run once after all autorouting is complete
    if (this._drcChecksComplete) return
    this._drcChecksComplete = true

    const errors = checkEachPcbTraceNonOverlapping(db.toArray())
    for (const error of errors) {
      db.pcb_trace_error.insert(error)
    }

    const pcbPortNotConnectedErrors = checkEachPcbPortConnectedToPcbTraces(
      db.toArray(),
    )
    for (const error of pcbPortNotConnectedErrors) {
      db.pcb_port_not_connected_error.insert(error)
    }

    const pcbComponentOutsideErrors = checkPcbComponentsOutOfBoard(db.toArray())
    for (const error of pcbComponentOutsideErrors) {
      db.pcb_component_outside_board_error.insert(error)
    }
  }

  override _emitRenderLifecycleEvent(
    phase: RenderPhase,
    startOrEnd: "start" | "end",
  ) {
    super._emitRenderLifecycleEvent(phase, startOrEnd)
    if (startOrEnd === "start") {
      this.root?.emit("board:renderPhaseStarted", {
        renderId: this._renderId,
        phase,
      })
    }
  }
}
