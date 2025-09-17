import "circuit-json"

declare module "circuit-json" {
  interface CadComponent {
    model_mtl_url?: string
  }

  interface PcbTrace {
    pcb_group_id?: string
    subcircuit_id?: string
    trace_length?: number
    rats_nest_color?: string
  }

  interface PcbNet {
    rats_nest_color?: string
  }
}
