interface AdsWindow extends Window {
  dataLayer: unknown[]
  gtag: (...args: unknown[]) => void
  adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number }
}

function addScript(src: string) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  if (src.includes('adsbygoogle')) s.crossOrigin = 'anonymous'
  document.head.appendChild(s)
}

export default defineNuxtPlugin((nuxtApp) => {
  const { gaId, adsenseClient } = useRuntimeConfig().public
  const w = window as unknown as AdsWindow
  const consent = useConsent()

  let gaLoaded = false
  function pageView() {
    if (gaLoaded) w.gtag('event', 'page_view', { page_path: location.pathname, page_title: document.title })
  }
  function loadGa() {
    if (gaLoaded || !gaId) return
    gaLoaded = true
    w.dataLayer = w.dataLayer || []
    // gtag.js は Array ではなく arguments オブジェクトを要求する
    // eslint-disable-next-line prefer-rest-params
    w.gtag = function () { w.dataLayer.push(arguments) }
    w.gtag('js', new Date())
    w.gtag('config', gaId, { send_page_view: false })
    addScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`)
    pageView()
  }

  // 同意前は非パーソナライズ広告。以降のリクエストから同意状態を反映する
  let adsLoaded = false
  function applyAds(granted: boolean) {
    if (!adsenseClient) return
    w.adsbygoogle = w.adsbygoogle || []
    w.adsbygoogle.requestNonPersonalizedAds = granted ? 0 : 1
    if (!adsLoaded) {
      adsLoaded = true
      // 初期表示(LCP)を妨げないよう、load 後のアイドル時に読み込む
      const load = () => addScript(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`)
      const idle = () => ('requestIdleCallback' in window ? window.requestIdleCallback(load, { timeout: 3000 }) : setTimeout(load, 1500))
      if (document.readyState === 'complete') idle()
      else window.addEventListener('load', idle, { once: true })
    }
  }

  // ハイドレーション不一致を避けるため、localStorage の読み込みはマウント後に行う
  nuxtApp.hook('app:mounted', () => {
    consent.load()
    watch(consent.state, (v) => {
      applyAds(v === 'granted')
      if (v === 'granted') loadGa()
    }, { immediate: true })
  })

  nuxtApp.hook('page:finish', () => pageView())
})
