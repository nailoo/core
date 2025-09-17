import { traceProps as baseTraceProps } from "@tscircuit/props"
import { z } from "zod"

export const traceProps = baseTraceProps.extend({
  ratsNestColor: z.string().optional(),
})

export type TracePropsSchema = typeof traceProps
