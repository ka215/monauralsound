const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default defineEventHandler(async (event) => {
  const site = await getSite()
  const base = useRuntimeConfig(event).public.siteUrl
  const urls = [
    { loc: '/', lastmod: site.postList[0]?.date },
    { loc: '/contact' },
    ...[...site.categories.keys()].map(s => ({ loc: `/${s}` })),
    ...[...site.pages.keys()].map(s => ({ loc: `/${s}` })),
    ...[...site.docs.keys()].map(s => ({ loc: `/jquery-timeline/${s}` })),
    ...[...site.posts.values()].map(p => ({ loc: `/${p.slug}`, lastmod: p.modified })),
  ]
  const body = urls
    .map(u => `<url><loc>${esc(base + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`)
    .join('')
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`
})
