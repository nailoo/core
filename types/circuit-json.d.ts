import "circuit-json"

declare module "circuit-json" {
  interface CadComponent {
    model_mtl_url?: string
  }

  interface SchematicPort {
    distance_from_component_edge?: number | null
  }
}
