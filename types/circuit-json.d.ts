import "circuit-json"

declare module "circuit-json" {
  interface CadComponent {
    model_mtl_url?: string
  }

  interface SourcePort {
    source_group_id?: string
  }

  interface SourceGroup {
    show_as_schematic_box?: boolean
  }

  interface SchematicComponent {
    is_schematic_group?: boolean
    source_group_id?: string
  }
}
