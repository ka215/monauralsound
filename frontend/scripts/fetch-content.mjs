// WP REST(wp/v2)から読み取り専用でコンテンツのスナップショットを取得する。ビルド時(Cloudflare Pages)も同じ手順。
// 使い方: pnpm fetch:content   (出力先: .data/*.json。Git 管理外)
// ONLY_MIGRATED=1 で migration-ids.json の ID に絞る(旧サイトの REST を参照する移行検証用)。
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', '.data')
const base = (process.env.NUXT_WP_API_BASE || 'https://manage.ka2.org/wp-json').replace(/\/$/, '')
const allow = JSON.parse(await readFile(join(here, 'migration-ids.json'), 'utf8'))
const only = process.env.ONLY_MIGRATED === '1'

async function getAll(path, fields, perPage = 100) {
  const items = []
  for (let page = 1; ; page++) {
    const url = `${base}/wp/v2/${path}?per_page=${perPage}&page=${page}&_fields=${fields}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (res.status === 400) break // 範囲外ページ
    if (!res.ok) throw new Error(`${res.status} ${url}`)
    items.push(...(await res.json()))
    if (page >= Number(res.headers.get('X-WP-TotalPages') || 1)) break
  }
  return items
}

const postFields = 'id,slug,link,date,modified,title,excerpt,content,categories,tags,featured_media,author,meta'
const [posts, pages, docs, categories, tags, media] = await Promise.all([
  getAll('posts', postFields),
  getAll('pages', 'id,slug,link,date,modified,title,content'),
  getAll('docs', postFields.replace(',tags', '') + ',parent').catch(() => []),
  getAll('categories', 'id,slug,name,description,count,parent'),
  getAll('tags', 'id,slug,name,count'),
  getAll('media', 'id,source_url,alt_text,media_details,mime_type'),
])

const pick = (items, ids) => (only ? items.filter((i) => ids.includes(i.id)) : items)
const result = {
  posts: pick(posts, allow.post),
  pages: pick(pages, allow.page),
  docs: pick(docs, allow.docs),
  categories,
  tags,
  media,
  // 新 backend は meta.featured(ka2-content-model)。旧サイトのスナップショットは移行 ID の一覧で代用する
  featured: posts.some((p) => p.meta && 'featured' in p.meta)
    ? posts.filter((p) => p.meta.featured === true).map((p) => p.id)
    : allow.featured,
}

await mkdir(outDir, { recursive: true })
for (const [name, data] of Object.entries(result)) {
  await writeFile(join(outDir, `${name}.json`), JSON.stringify(data))
}
console.log(Object.entries(result).map(([k, v]) => `${k}=${v.length}`).join(' '))
