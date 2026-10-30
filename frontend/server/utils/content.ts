import { buildSite } from './content-core'
import type { RawContent, Site } from './content-core'

let site: Promise<Site> | undefined

// `.data/` は nitro.serverAssets 経由でバンドルされる(取得は `pnpm fetch:content`)
export function getSite(): Promise<Site> {
  site ??= (async () => {
    const storage = useStorage('assets:content')
    const names = ['posts', 'pages', 'docs', 'categories', 'tags', 'media', 'featured'] as const
    const entries = await Promise.all(names.map(async n => [n, await storage.getItem(`${n}.json`)] as const))
    const raw = Object.fromEntries(entries) as unknown as RawContent
    if (!raw.posts?.length) throw new Error('content snapshot not found: run `pnpm fetch:content`')
    return buildSite(raw)
  })()
  return site
}
