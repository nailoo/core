import { expect } from "bun:test"

type AnyExpect = typeof expect & {
  __bunMatchSvgShimInstalled?: boolean
}

export const registerBunMatchSvgFallback = () => {
  const expectWithMarker = expect as AnyExpect
  if (expectWithMarker.__bunMatchSvgShimInstalled) return
  expectWithMarker.__bunMatchSvgShimInstalled = true

  // Provide a minimal stub matcher to emulate bun-match-svg's API when the
  // optional dependency isn't available in offline environments. The matcher
  // simply compares the received and expected SVG strings.
  expect.extend({
    toMatchSvg(this: any, received: string, expected: string) {
      const pass = received === expected
      return {
        pass,
        message: () =>
          pass
            ? "SVGs match (fallback stub)"
            : "SVGs do not match (fallback stub)",
      }
    },
  })
}
