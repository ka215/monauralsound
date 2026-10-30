// 無限スクロール用の静的 JSON。1 ページ目はトップの HTML に含まれるため 2 ページ目以降を配信する
const PAGE_SIZE = 12

export default defineEventHandler(async (event) => {
  const page = Number(getRouterParam(event, 'page'))
  const site = await getSite()
  const total = Math.ceil(site.postList.length / PAGE_SIZE)
  if (!Number.isInteger(page) || page < 1 || page > total) {
    throw createError({ statusCode: 404 })
  }
  return {
    items: site.postList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    hasMore: page < total,
  }
})
