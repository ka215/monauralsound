<script setup lang="ts">
const { data } = await useFetch('/api/home')
useSeo({ title: '', description: '個人開発・WordPress・ライフログのブログ', path: '/' })

const tab = ref<'latest' | 'featured'>('latest')
const tabs = [
  { key: 'latest', label: '新着' },
  { key: 'featured', label: '注目' },
] as const

// 新着は 1 ページ目を HTML に含め、2 ページ目以降はスクロールで静的 JSON を取得する
type Item = NonNullable<typeof data.value>['latest'][number]
const more = ref<Item[]>([])
const nextPage = ref(2)
const hasMore = ref(true)
const loading = ref(false)
const failed = ref(false)
const sentinel = ref<HTMLElement | null>(null)

// 6 件ごとに広告を挟む(1/2/3 列のいずれでも行が揃う)。非表示タブでは幅 0 でエラーになるため出さない
const AD_EVERY = 6
function listOf(key: 'latest' | 'featured'): Item[] {
  return key === 'latest' ? [...(data.value?.latest ?? []), ...more.value] : (data.value?.featured ?? [])
}

async function loadMore() {
  if (loading.value || !hasMore.value) return
  loading.value = true
  failed.value = false
  try {
    const res = await $fetch<{ items: Item[], hasMore: boolean }>(`/api/posts/${nextPage.value}`, { responseType: 'json' })
    more.value.push(...res.items)
    hasMore.value = res.hasMore
    nextPage.value++
  }
  catch {
    failed.value = true
  }
  finally {
    loading.value = false
  }
}

let observer: IntersectionObserver | undefined
onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting) && !failed.value) loadMore()
  }, { rootMargin: '400px 0px' })
  watchEffect(() => {
    observer?.disconnect()
    if (sentinel.value) observer?.observe(sentinel.value)
  })
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div v-if="data">
    <!-- ヘッダ(h-14)の直下に固定。セグメント型で切替可能と分かる外観にし、全体を 48px に抑える -->
    <div
      style="top: calc(3.5rem + 1px + env(safe-area-inset-top))"
      class="sticky z-10 -mx-4 -mt-6 mb-4 border-b border-slate-200 bg-white/95 px-4 py-1.5 backdrop-blur"
    >
      <div role="tablist" class="flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          v-for="t in tabs"
          :id="`tab-${t.key}`"
          :key="t.key"
          type="button"
          role="tab"
          :aria-selected="tab === t.key"
          :aria-controls="`panel-${t.key}`"
          class="h-9 flex-1 rounded-md text-sm font-bold transition-colors"
          :class="tab === t.key ? 'bg-white text-cyan-700 shadow-sm dark:text-cyan-300 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'"
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </div>
    </div>
    <div
      v-for="t in tabs"
      v-show="tab === t.key"
      :id="`panel-${t.key}`"
      :key="t.key"
      role="tabpanel"
      :aria-labelledby="`tab-${t.key}`"
      class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <template v-for="(p, i) in listOf(t.key)" :key="p.slug">
        <PostCard :post="p" />
        <AdSlot v-if="(i + 1) % AD_EVERY === 0 && tab === t.key" class="col-span-full" />
      </template>
    </div>
    <div v-show="tab === 'latest'" class="py-6 text-center text-sm text-slate-500">
      <div v-if="hasMore" ref="sentinel" aria-live="polite">
        <button v-if="failed" type="button" class="rounded border border-slate-300 px-4 py-2" @click="loadMore()">読み込みに失敗しました。再試行</button>
        <span v-else>読み込み中…</span>
      </div>
      <p v-else>すべての記事を表示しました</p>
    </div>
  </div>
</template>
