import "circuit-json"

declare module "circuit-json" {
  interface CadComponent {
    model_mtl_url?: string
  }

  interface PcbTrace {
    rats_nest_color?: string
  }

  interface PcbNet {
    type: "pcb_net"
    pcb_net_id: string
    source_net_id?: string
    rats_nest_color?: string
  }
}
