import type { Article, CategoryEntry, SimpleDoc } from '../../utils/content-core'

export type Entry =
  | { type: 'post', post: Article }
  | { type: 'category', category: CategoryEntry }
  | { type: 'page', page: SimpleDoc }

export default defineEventHandler(async (event): Promise<Entry> => {
  // 日本語を含む slug は WP が小文字のパーセントエンコードで保持しているため、同じ形に揃えて照合する
  const raw = getRouterParam(event, 'slug') ?? ''
  const slug = encodeURIComponent(decodeURIComponent(raw)).toLowerCase()
  const site = await getSite()
  const post = site.posts.get(slug)
  if (post) return { type: 'post', post }
  const category = site.categories.get(slug)
  if (category) return { type: 'category', category }
  const page = site.pages.get(slug)
  if (page) return { type: 'page', page }
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
})
