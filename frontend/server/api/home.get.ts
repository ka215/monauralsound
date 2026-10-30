export default defineEventHandler(async () => {
  const site = await getSite()
  return {
    featured: site.featured,
    latest: site.postList.slice(0, 12),
    categories: [...site.categories.values()].map(c => ({ slug: c.slug, name: c.name, count: c.posts.length })),
  }
})
