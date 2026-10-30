export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const doc = (await getSite()).docs.get(slug)
  if (!doc) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  return doc
})
