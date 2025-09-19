await import("bun-match-svg").catch(async () => {
  const { registerBunMatchSvgFallback } = await import(
    "./bun-match-svg-shim"
  )
  registerBunMatchSvgFallback()
})

import "./extend-expect-any-svg"
import "lib/register-catalogue"

declare module "bun:test" {
  interface Matchers<T = unknown> {
    toMatchInlineSnapshot(snapshot?: string | null): Promise<MatcherResult>
  }
}
