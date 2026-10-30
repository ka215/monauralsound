<script setup lang="ts">
const { siteName } = useRuntimeConfig().public
const consent = useConsent()
const theme = useTheme()
const open = ref(false)
const drawerTop = 'calc(3.5rem + 1px + env(safe-area-inset-top))'
const route = useRoute()
watch(() => route.path, () => { open.value = false })
onMounted(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') open.value = false
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})
onMounted(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})

const { data } = await useFetch('/api/home')
const mock = 'https://magic-methods.ka2.org/mockup'
const products = [
  { name: 'jQuery.Timeline v2', href: `${mock}/jqtl_v2/`, icon: 'jquery-timeline' },
  { name: 'jQuery.Timeline v1', href: `${mock}/jqtl_v1/`, icon: 'jquery-timeline' },
  { name: 'Sloth Docs', href: `${mock}/sloth/`, icon: 'sloth' },
  { name: 'Sunorhc', href: `${mock}/sunorhc/`, icon: 'sunorhc' },
  { name: 'SVG Japan', href: `${mock}/svg-japan/`, icon: 'earth' },
]
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-white text-slate-800">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">本文へ移動</a>
    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <NuxtLink to="/" class="flex items-center gap-2 text-lg font-bold">
          <img src="/logo.svg" alt="" width="32" height="32" class="size-8">
          <img src="/ms_typo.svg" :alt="siteName" width="482" height="57" class="h-4 w-auto">
        </NuxtLink>
        <div class="-mr-2 flex items-center">
          <button type="button" class="flex size-11 items-center justify-center rounded" aria-label="ライト/ダークモードを切り替え" @click="theme.toggle()">
            <svg viewBox="0 0 24 24" class="size-6 text-amber-500 dark:hidden" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
            <svg viewBox="0 0 24 24" class="hidden size-6 text-[#e8472b] dark:block" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </button>
          <button
            type="button"
            class="flex size-11 items-center justify-center rounded"
            :aria-expanded="open"
            aria-controls="site-menu"
            aria-label="メニュー"
            @click="open = !open"
          >
            <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path v-if="!open" d="M4 7h16M4 12h16M4 17h16" />
              <path v-else d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </header>
    <!-- backdrop-filter を持つ header の外に置く(fixed の基準が header になるのを避ける) -->
    <div
      class="fixed inset-x-0 bottom-0 z-40 bg-black/40 transition-opacity duration-300 max-sm:hidden"
      :class="open ? 'opacity-100' : 'pointer-events-none opacity-0'"
      :style="{ top: drawerTop }"
      aria-hidden="true"
      @click="open = false"
    />
    <nav
      id="site-menu"
      :inert="!open"
      class="fixed right-0 bottom-0 z-40 w-full max-w-[390px] overflow-y-auto overscroll-contain border-t border-l border-slate-200 bg-white transition-[transform,visibility] duration-300 ease-out"
      :class="open ? 'visible translate-x-0' : 'invisible translate-x-full'"
      :style="{ top: drawerTop }"
    >
      <div class="space-y-3 px-4 py-3">
        <section>
          <h2 class="text-xs font-bold text-slate-500">プロダクト</h2>
          <ul class="mt-1 text-sm">
            <li v-for="p in products" :key="p.href">
              <a :href="p.href" class="flex h-9 items-center" rel="noopener"><span :class="`msicon-${p.icon}`" aria-hidden="true" class="mr-1.5 text-slate-500" />{{ p.name }}</a>
            </li>
          </ul>
        </section>
        <section>
          <h2 class="text-xs font-bold text-slate-500">カテゴリ</h2>
          <ul class="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            <li v-for="c in data?.categories" :key="c.slug">
              <NuxtLink :to="`/${c.slug}`" class="block rounded-full border border-slate-300 px-2.5 py-1">{{ c.name }} <span class="text-slate-400">{{ c.count }}</span></NuxtLink>
            </li>
          </ul>
        </section>
        <section>
          <h2 class="text-xs font-bold text-slate-500">サイト</h2>
          <ul class="mt-1 text-sm">
            <li><NuxtLink to="/contact" class="flex h-9 items-center">お問い合わせ</NuxtLink></li>
            <li><NuxtLink to="/privacy-policy" class="flex h-9 items-center">プライバシーポリシー</NuxtLink></li>
            <li><a href="/rss.xml" class="flex h-9 items-center">RSS</a></li>
          </ul>
        </section>
      </div>
    </nav>
    <main id="main" class="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <slot />
    </main>
    <AuthorProfile />
    <footer class="border-t border-slate-200 pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-sm text-slate-500">
      <p class="space-x-4">
        <NuxtLink to="/privacy-policy">プライバシーポリシー</NuxtLink>
        <NuxtLink to="/contact">お問い合わせ</NuxtLink>
        <button type="button" class="underline" @click="consent.reopen()">Cookie 設定</button>
      </p>
      <p class="mt-5 text-xs">&copy; 2003 - {{ new Date().getFullYear() }} MAGIC METHODS, ka2.org.</p>
    </footer>
    <ScrollTopButton />
    <ConsentBanner />
  </div>
</template>
