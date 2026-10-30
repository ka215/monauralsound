// https://nuxt.com/docs/api/configuration/nuxt-config
import { existsSync, readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import { listRoutes } from './server/utils/content-core'
import type { RawContent } from './server/utils/content-core'

// 生成対象ルートの列挙用(.data が無い場合は `/` のみ)
function readContentIds(): RawContent {
  const read = (n: string) => (existsSync(`.data/${n}.json`) ? JSON.parse(readFileSync(`.data/${n}.json`, 'utf8')) : [])
  return { posts: read('posts'), pages: read('pages'), docs: read('docs'), categories: read('categories'), tags: [], media: [], featured: [] }
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    // ビルド時のみ使用する WP REST の接続先(NUXT_WP_API_BASE で上書き)
    wpApiBase: 'http://localhost/manage.ka2.org/wp-json',
    public: {
      siteUrl: 'https://ka2.org',
      siteName: 'Monaural Sound',
      // 既存 ID を継承。NUXT_PUBLIC_* で上書き可能。広告ユニットは未設定なら自動広告のみ
      gaId: 'G-M0V96QQ4KT',
      adsenseClient: 'ca-pub-8602791446931111',
      adsenseSlot: '6050360069',
      // true の場合は実広告の代わりにダミー枠を表示する(NUXT_PUBLIC_ADSENSE_DEBUG=true)
      adsenseDebug: false,
      // 問い合わせ API(manage 側の mu-plugin)。ローカルは .env で http://localhost:8081/wp-json に上書きする
      contactApi: 'https://manage.ka2.org/wp-json/ka2/v1/contact',
      // 既定は Cloudflare のテスト用サイトキー(常に成功)。本番は NUXT_PUBLIC_TURNSTILE_SITE_KEY で設定する
      turnstileSiteKey: '1x00000000000000000000AA',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'ja' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#ffffff' },
      ],
      link: [{ rel: 'icon', href: '/favicon.ico' }, { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
      // 初回描画前にテーマを適用してちらつきを防ぐ(保存値 > OS 設定)
      script: [{
        innerHTML: 'try{var t=localStorage.getItem("ka2:theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}',
        tagPosition: 'head',
      }],
    },
  },
  nitro: {
    // Cloudflare Pages 上のビルドで cloudflare_pages に自動切替され、出力先と _redirects/_headers が変わるのを防ぐ
    preset: 'static',
    // 開発時のみ画像を管理サイトから取得(本番は Phase 7 の Pages Functions でプロキシ)
    devProxy: {
      '/assets/uploads': { target: 'https://manage.ka2.org/assets/uploads', changeOrigin: true },
    },
    serverAssets: [{ baseName: 'content', dir: './.data' }],
    prerender: {
      crawlLinks: false,
      // Cloudflare Pages は `x.html` を `/x` で配信する(`x/index.html` だと `/x/` へ 308 してしまい canonical と食い違う)
      autoSubfolderIndex: false,
      failOnError: true,
      routes: listRoutes(readContentIds()),
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Monaural Sound',
      short_name: 'ka2.org',
      lang: 'ja',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#ffffff',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: undefined,
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    injectManifest: {
      globPatterns: ['**/*.{js,css,png,svg,ico,webmanifest}', 'index.html', 'offline.html'],
      globIgnores: ['**/_payload.json'],
    },
    client: { installPrompt: false },
    devOptions: { enabled: false },
  },
})
