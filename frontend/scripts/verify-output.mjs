// 生成物の検証: 全記事・固定ルートの出力有無と、本文変換の取りこぼしを確認する
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const here = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const root = join(here, '.output', 'public')
const data = (n) => JSON.parse(readFileSync(join(here, '.data', `${n}.json`), 'utf8'))
const slugPath = (s) => decodeURIComponent(s)

const expected = [
  ...data('posts').map((p) => `${slugPath(p.slug)}.html`),
  ...data('pages').map((p) => `${p.slug}.html`),
  ...['getting-started', 'configuring-plugin-options', 'jqtl-v2-methods', 'timeline-events', 'samples'].map((s) => `jquery-timeline/${s}.html`),
  'index.html', 'contact.html', 'sitemap.xml', 'rss.xml', 'manifest.webmanifest', 'sw.js', '_redirects', '_headers',
  ...Array.from({ length: Math.ceil(data('posts').length / 12) - 1 }, (_, i) => `api/posts/${i + 2}`),
]
const missing = expected.filter((f) => !existsSync(join(root, f)))

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
const htmls = walk(root).filter((f) => f.endsWith('.html') && !/(?:200|404)\.html$/.test(f))
const scriptChunks = walk(root).filter((f) => /[\\/]_nuxt[\\/][\w-]+\.js$/.test(f))
const sw = readFileSync(join(root, 'sw.js'), 'utf8')
const precachedScripts = scriptChunks.filter((f) => sw.includes(`"url":"${relative(root, f).replaceAll('\\', '/')}"`))
const count = (re) => htmls.filter((f) => re.test(readFileSync(f, 'utf8'))).length
const checks = {
  expected: expected.length,
  missing,
  html: htmls.length,
  photon: count(/i\d\.wp\.com\/(?:stg\.|manage\.)?ka2\.org/),
  shortcode: count(/\[(?:embed|amazonjs|cdbt)/),
  oldAssets: count(/ka2\.org\/(?:assets\/(?!uploads\/|files\/)|wp-content\/)/),
  highlighted: count(/class="shiki/),
  scriptChunks: scriptChunks.length,
  precachedScripts: precachedScripts.length,
}
console.log(checks)
process.exit(missing.length || checks.photon || checks.shortcode || checks.oldAssets || checks.scriptChunks === 0 || checks.precachedScripts ? 1 : 0)
