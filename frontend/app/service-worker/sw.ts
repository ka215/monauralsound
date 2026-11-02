/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { registerRoute, setCatchHandler } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// 記事ページ: キャッシュを即返しつつ裏で更新する
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'pages',
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
)

// クライアント遷移で取得されるペイロード
registerRoute(
  ({ url }) => url.pathname.endsWith('/_payload.json'),
  new StaleWhileRevalidate({
    cacheName: 'payloads',
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
)

// JavaScript は使うページで取得し、初回アクセス後はオフラインでも使えるようにする
registerRoute(
  ({ url }) => url.pathname.startsWith('/_nuxt/') && url.pathname.endsWith('.js'),
  new CacheFirst({
    cacheName: 'scripts',
    plugins: [new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true })],
  }),
)

// 記事内の画像(manage 側から配信)
registerRoute(
  ({ url }) => url.pathname.startsWith('/assets/'),
  new CacheFirst({
    cacheName: 'assets',
    plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 60, purgeOnQuotaError: true })],
  }),
)

// 未キャッシュのページをオフラインで開いた場合
setCatchHandler(async ({ request }) => {
  if (request.mode === 'navigate') {
    const res = await matchPrecache('/offline.html') ?? await matchPrecache('/offline')
    if (res) return res
  }
  return Response.error()
})
