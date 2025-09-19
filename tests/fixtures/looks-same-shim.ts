import * as fs from "node:fs"
import * as path from "node:path"

type LooksSameResult = {
  equal: boolean
  diffClusters: Array<{
    left: number
    top: number
    right: number
    bottom: number
  }>
  metaInfo: {
    refImg: {
      size: {
        width: number
        height: number
      }
    }
  }
}

type LooksSameFunction = (
  reference: Buffer,
  current: Buffer,
  _options?: unknown,
) => Promise<LooksSameResult>

const looksSame: LooksSameFunction & {
  createDiff: (options: {
    reference: Buffer
    current: Buffer
    diff: string
    highlightColor?: string
  }) => Promise<void>
} = Object.assign(
  async (reference: Buffer, current: Buffer): Promise<LooksSameResult> => ({
    equal: reference.equals(current),
    diffClusters: [],
    metaInfo: {
      refImg: {
        size: {
          width: Math.max(reference.length, 1),
          height: 1,
        },
      },
    },
  }),
  {
    async createDiff({ diff }: {
      reference: Buffer
      current: Buffer
      diff: string
      highlightColor?: string
    }): Promise<void> {
      const dir = path.dirname(diff)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(diff, Buffer.alloc(0))
    },
  },
)

export default looksSame
