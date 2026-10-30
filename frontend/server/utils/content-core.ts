// ビルド時のコンテンツ処理(純粋関数のみ)。Nuxt の自動インポートに依存しない(nuxt.config.ts からも読み込むため)。
import { createHighlighter, bundledLanguages } from 'shiki'
import type { Highlighter } from 'shiki'

export interface RawRendered { rendered: string }
export interface RawPost {
  id: number
  slug: string
  date: string
  modified: string
  title: RawRendered
  excerpt?: RawRendered
  content: RawRendered
  featured_media: number
  categories?: number[]
  tags?: number[]
}
export interface RawPage { id: number, slug: string, date: string, modified: string, title: RawRendered, content: RawRendered }
export interface RawTerm { id: number, slug: string, name: string, description?: string, parent?: number }
export interface RawMedia { id: number, source_url: string, alt_text?: string }
export interface RawContent {
  posts: RawPost[]
  pages: RawPage[]
  docs: RawPost[]
  categories: RawTerm[]
  tags: RawTerm[]
  media: RawMedia[]
  featured: number[]
}

export interface TermRef { slug: string, name: string }
export interface Summary {
  slug: string
  title: string
  date: string
  excerpt: string
  image: string | null
  categories: TermRef[]
}
export interface Article extends Summary {
  modified: string
  html: string
  tags: TermRef[]
  related: Summary[]
  prev: Summary | null
  next: Summary | null
}
export interface SimpleDoc { slug: string, title: string, date: string, modified: string, html: string, excerpt: string }
export interface CategoryEntry { slug: string, name: string, description: string, posts: Summary[] }
export interface Site {
  posts: Map<string, Article>
  postList: Summary[]
  featured: Summary[]
  categories: Map<string, CategoryEntry>
  pages: Map<string, SimpleDoc>
  docs: Map<string, SimpleDoc>
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', hellip: '…' }
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1]?.toLowerCase() === 'x' ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10)
      return Number.isNaN(code) ? m : String.fromCodePoint(code)
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

const plain = (html: string) => decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()

// Jetpack Photon や旧 wp-content / assets 配下の画像を、新構成の `/assets/uploads/...` に揃える
const OWN = '(?:www\\.|stg\\.|manage\\.)?ka2\\.org'
const ASSET_RE = new RegExp(`https?://(?:i\\d\\.wp\\.com/)?(?:${OWN}|localhost:\\d+)/(?:apps/)?(?:assets|wp-content)/(?:uploads/)?(\\d{4}/[^\\s"'<>?]*)(?:\\?[^\\s"'<>]*)?`, 'g')
const FILES_RE = new RegExp(`https?://(?:i\\d\\.wp\\.com/)?${OWN}/assets/files/([^\\s"'<>?]*)(?:\\?[^\\s"'<>]*)?`, 'g')
const PHOTON_RE = /https?:\/\/i\d\.wp\.com\/([^\s"'<>?]+)(?:\?[^\s"'<>]*)?/g
export function normalizeAssetUrl(url: string): string {
  return url
    .replace(ASSET_RE, '/assets/uploads/$1')
    .replace(FILES_RE, '/assets/files/$1')
    .replace(PHOTON_RE, 'https://$1')
}

const DOC_MAP: Record<string, string> = {
  '/docs/jquery-timeline/getting-started': '/jquery-timeline/getting-started',
  '/docs/jquery-timeline/configuring-plugin-options': '/jquery-timeline/configuring-plugin-options',
  '/docs/jquery-timeline/jqtl-v2-methods': '/jquery-timeline/jqtl-v2-methods',
  '/docs/timeline-events': '/jquery-timeline/timeline-events',
  '/docs/jquery-timeline-samples': '/jquery-timeline/samples',
}

const DOC_SLUG: Record<string, string> = { 'jquery-timeline-samples': 'samples' }
const docSlug = (slug: string) => DOC_SLUG[slug] ?? slug

export function normalizeLink(path: string): string {
  const m = /^([^?#]*)(.*)$/.exec(path)!
  let p = m[1]!
  if (p.length > 1 && p.endsWith('/') && !p.startsWith('/mhr/')) p = p.slice(0, -1)
  return (DOC_MAP[p] ?? p) + m[2]
}

const SHORTCODE_RE = /\[embed\][\s\S]*?\[\/embed\]|\[\/?(?:embed|amazonjs|cdbt[\w-]*)\b[^\]]*\]/gi
// 抜粋は切り詰め済みで閉じ括弧が無い場合があるため、末尾まで除去する
const EXCERPT_SHORTCODE_RE = /\[\/?(?:embed|amazonjs|cdbt[\w-]*)\b[^\]]*(?:\]|$)/gi

// WP 側で変換されなかった Markdown を補完する(コード・コメント・タグ属性は対象外)
const PROTECTED_RE = /(<(?:pre|code|script|style)\b[\s\S]*?<\/(?:pre|code|script|style)>|<[^>]+>)|([^<]+)/g
function fixMarkdown(html: string): string {
  const withLists = html.replace(/<p>((?:(?!<\/p>)[\s\S])*?)<\/p>/g, (m, inner: string) => {
    if (!/(?:^|<br ?\/?>\s*)\* \S/.test(inner)) return m
    const out: string[] = []
    let items: string[] = []
    let para: string[] = []
    const flushPara = () => {
      if (para.length) out.push(`<p>${para.join('<br />\n')}</p>`)
      para = []
    }
    const flushList = () => {
      if (items.length) out.push(`<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`)
      items = []
    }
    for (const line of inner.split(/<br ?\/?>\s*/)) {
      const bullet = /^\* (\S[\s\S]*)$/.exec(line.trim())
      if (bullet) {
        flushPara()
        items.push(bullet[1]!)
      }
      else {
        flushList()
        para.push(line)
      }
    }
    flushPara()
    flushList()
    return out.join('\n')
  })
  return withLists.replace(PROTECTED_RE, (m, tag: string | undefined, text: string | undefined) =>
    tag ? m : (text ?? '').replace(/`([^`\n]+)`/g, '<code>$1</code>'))
}

function cleanBody(html: string): string {
  return fixMarkdown(normalizeAssetUrl(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(SHORTCODE_RE, '')
    .replace(/<p>\s*<\/p>/g, ''))
    .replace(/href="(?:https?:\/\/(?:www\.)?ka2\.org)?(\/(?!\/)[^"]*)"/g, (_, p: string) => `href="${normalizeLink(p)}"`)
}

let highlighter: Promise<Highlighter> | undefined
const LANG_ALIAS: Record<string, string> = { cmd: 'bat', git: 'shell', sh: 'shell', ts: 'typescript' }
const langOf = (l?: string) => (l ? (LANG_ALIAS[l] ?? l) : '')

async function highlight(html: string): Promise<string> {
  const re = /<pre(?: class="[^"]*")?>\s*<code(?: class="language-([\w+-]+)")?>([\s\S]*?)<\/code>\s*<\/pre>/g
  const hits = [...html.matchAll(re)]
  if (!hits.length) return html
  const wanted = new Set(hits.map(h => langOf(h[1])).filter(l => l in bundledLanguages))
  highlighter ??= createHighlighter({ themes: ['github-dark'], langs: [] })
  const hl = await highlighter
  const loaded = new Set(hl.getLoadedLanguages())
  for (const l of wanted) if (!loaded.has(l)) await hl.loadLanguage(l as never)

  let out = ''
  let last = 0
  for (const h of hits) {
    const lang = langOf(h[1])
    out += html.slice(last, h.index)
    last = h.index! + h[0].length
    out += lang in bundledLanguages
      ? hl.codeToHtml(decodeEntities(h[2]!), { lang, theme: 'github-dark' })
      : h[0]
  }
  return out + html.slice(last)
}

export async function buildSite(raw: RawContent): Promise<Site> {
  const media = new Map(raw.media.map(m => [m.id, normalizeAssetUrl(m.source_url)]))
  const catById = new Map(raw.categories.map(c => [c.id, c]))
  const tagById = new Map(raw.tags.map(t => [t.id, t]))
  const ref = (t: RawTerm): TermRef => ({ slug: t.slug, name: decodeEntities(t.name) })

  const summarize = (p: RawPost): Summary => ({
    slug: p.slug,
    title: decodeEntities(p.title.rendered),
    date: p.date,
    excerpt: plain(p.excerpt?.rendered ?? '').replace(EXCERPT_SHORTCODE_RE, '').replace(/\s*\[…\]$/, '…').trim().slice(0, 200),
    image: media.get(p.featured_media) ?? null,
    categories: (p.categories ?? []).flatMap(id => catById.get(id) ?? []).map(ref),
  })

  const sorted = [...raw.posts].sort((a, b) => b.date.localeCompare(a.date))
  const summaries = new Map(sorted.map(p => [p.slug, summarize(p)]))
  const postList = sorted.map(p => summaries.get(p.slug)!)

  const posts = new Map<string, Article>()
  for (const [i, p] of sorted.entries()) {
    const own = new Set(p.tags ?? [])
    const ownCats = new Set(p.categories ?? [])
    const related = sorted
      .filter(o => o.id !== p.id)
      .map(o => ({
        o,
        score: (o.tags ?? []).filter(t => own.has(t)).length * 2 + (o.categories ?? []).filter(c => ownCats.has(c)).length,
      }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || b.o.date.localeCompare(a.o.date))
      .slice(0, 4)
      .map(x => summaries.get(x.o.slug)!)
    posts.set(p.slug, {
      ...summaries.get(p.slug)!,
      modified: p.modified,
      html: await highlight(cleanBody(p.content.rendered)),
      tags: (p.tags ?? []).flatMap(id => tagById.get(id) ?? []).map(ref),
      related,
      prev: summaries.get(sorted[i + 1]?.slug ?? '') ?? null,
      next: summaries.get(sorted[i - 1]?.slug ?? '') ?? null,
    })
  }

  const byId = new Map(sorted.map(p => [p.id, p]))
  const featured = raw.featured.flatMap(id => byId.get(id) ?? []).map(p => summaries.get(p.slug)!)

  const categories = new Map<string, CategoryEntry>()
  for (const c of raw.categories) {
    const list = postList.filter(s => s.categories.some(x => x.slug === c.slug))
    if (list.length) categories.set(c.slug, { slug: c.slug, name: decodeEntities(c.name), description: c.description ?? '', posts: list })
  }

  const simple = async (p: RawPage | RawPost): Promise<SimpleDoc> => ({
    slug: p.slug,
    title: decodeEntities(p.title.rendered),
    date: p.date,
    modified: p.modified,
    html: await highlight(cleanBody(p.content.rendered)),
    excerpt: plain('excerpt' in p ? (p.excerpt?.rendered ?? '') : ''),
  })
  const pages = new Map<string, SimpleDoc>()
  for (const p of raw.pages) pages.set(p.slug, await simple(p))
  const docs = new Map<string, SimpleDoc>()
  for (const p of raw.docs) docs.set(docSlug(p.slug), { ...await simple(p), slug: docSlug(p.slug) })

  for (const slug of [...categories.keys(), ...pages.keys(), 'contact']) {
    if (posts.has(slug)) throw new Error(`slug conflict: ${slug}`)
  }
  return { posts, postList, featured, categories, pages, docs }
}

export function listRoutes(raw: RawContent): string[] {
  const used = new Set(raw.posts.flatMap(p => p.categories ?? []))
  return [
    '/',
    '/contact',
    '/offline',
    ...raw.posts.map(p => `/${p.slug}`),
    ...raw.categories.filter(c => used.has(c.id)).map(c => `/${c.slug}`),
    ...raw.pages.map(p => `/${p.slug}`),
    ...raw.docs.map(d => `/jquery-timeline/${docSlug(d.slug)}`),
    ...Array.from({ length: Math.ceil(raw.posts.length / 12) - 1 }, (_, i) => `/api/posts/${i + 2}`),
    '/sitemap.xml',
    '/rss.xml',
  ]
}
