// ka2.org/assets/* を manage 側の uploads へプロキシする(URL を維持したまま画像を配信する)。
// 旧サイトの `/assets/<yyyy>/...` と `/assets/files/...` は uploads 直下の同名パスにあたるため、同じ場所へ解決する。
// R2 へ移す場合は、このファイルの取得元だけを差し替える。

interface Env {
  ASSETS_ORIGIN?: string
}

const DEFAULT_ORIGIN = 'https://manage.ka2.org'

// uploads には PHP やログも置けるため、配信する拡張子を許可リストで限定する
const ALLOWED = /\.(?:jpe?g|png|gif|webp|avif|svg|ico|mp3|m4a|ogg|wav|mp4|webm|pdf|zip|mo|po|txt|json)$/i

const notFound = () => new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'public, max-age=300' } })

export const onRequest = async ({ request, env }: { request: Request, env: Env }): Promise<Response> => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
  }

  const url = new URL(request.url)
  const raw = url.pathname.replace(/^\/assets\//, '').replace(/^uploads\//, '')
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return notFound()
  }
  if (!decoded || decoded.includes('..') || decoded.includes('\\') || decoded.includes('\0') || decoded.startsWith('/') || !ALLOWED.test(decoded)) {
    return notFound()
  }

  const origin = (env.ASSETS_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, '')
  const upstream = await fetch(`${origin}/assets/uploads/${raw}`, {
    method: request.method,
    headers: { Accept: request.headers.get('Accept') ?? '*/*' },
    redirect: 'manual',
    cf: { cacheEverything: true, cacheTtl: 604800, cacheTtlByStatus: { '200-299': 604800, '404': 300, '500-599': 0 } },
  } as RequestInit)

  if (!upstream.ok) return notFound()

  const headers = new Headers()
  for (const name of ['Content-Type', 'Content-Length', 'ETag', 'Last-Modified']) {
    const v = upstream.headers.get(name)
    if (v) headers.set(name, v)
  }
  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400')
  headers.set('X-Content-Type-Options', 'nosniff')
  if (/\.svg$/i.test(decoded)) headers.set('Content-Security-Policy', 'default-src \'none\'; style-src \'unsafe-inline\'; sandbox')

  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: 200, headers })
}
