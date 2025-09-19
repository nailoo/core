let cachedLooksSame: any

export const getLooksSame = async () => {
  if (cachedLooksSame) return cachedLooksSame

  const module = await import("looks-same").catch(async () => {
    return await import("./looks-same-shim")
  })

  const looksSame = (module as any).default ?? module
  if (!looksSame.createDiff && (module as any).createDiff) {
    looksSame.createDiff = (module as any).createDiff
  }

  cachedLooksSame = looksSame
  return looksSame
}
