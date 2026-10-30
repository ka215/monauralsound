export type ConsentState = 'granted' | 'denied' | null

const KEY = 'ka2:consent'

// 同意状態はブラウザの localStorage のみに保存する(サーバーへは送らない)
export function useConsent() {
  const state = useState<ConsentState>('consent', () => null)
  const ready = useState('consent-ready', () => false)
  const bannerOpen = useState('consent-banner', () => false)

  function load() {
    const v = localStorage.getItem(KEY)
    state.value = v === 'granted' || v === 'denied' ? v : null
    bannerOpen.value = state.value === null
    ready.value = true
  }

  function set(value: 'granted' | 'denied') {
    localStorage.setItem(KEY, value)
    state.value = value
    bannerOpen.value = false
  }

  return { state, ready, bannerOpen, load, set, reopen: () => { bannerOpen.value = true } }
}
