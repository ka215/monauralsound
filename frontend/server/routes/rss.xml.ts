const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default defineEventHandler(async (event) => {
  const site = await getSite()
  const { siteUrl, siteName } = useRuntimeConfig(event).public
  // WP の日時は JST のローカル値
  const items = [...site.posts.values()].slice(0, 20).map(p => `<item><title>${esc(p.title)}</title><link>${siteUrl}/${p.slug}</link><guid>${siteUrl}/${p.slug}</guid><pubDate>${new Date(`${p.date}+09:00`).toUTCString()}</pubDate><description>${esc(p.excerpt)}</description></item>`).join('')
  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(siteName)}</title><link>${siteUrl}</link><description>${esc(siteName)}</description><language>ja</language>${items}</channel></rss>`
})
