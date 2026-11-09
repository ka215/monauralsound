<script setup lang="ts">
import type { Article } from '../../server/utils/content-core'

const props = defineProps<{ post: Article }>()
const article = ref<HTMLElement>()
useSeo({ title: props.post.title, description: props.post.excerpt, path: `/${props.post.slug}`, image: props.post.image, type: 'article' })

// 見出しの直前(2・5・8 番目)に広告を差し込む。見出しが 2 つ未満なら本文末尾に 1 つ置く
const blocks = computed(() => {
  const parts = props.post.html.split(/(?=<h[23][\s>])/).filter(p => p.trim())
  const total = parts.filter(p => /^<h[23][\s>]/.test(p)).length
  let k = 0
  const out = parts.map((html) => {
    const isHeading = /^<h[23][\s>]/.test(html)
    if (isHeading) k++
    return { html, ad: total >= 2 && isHeading && k % 3 === 2 && k <= 8 }
  })
  return { blocks: out, tailAd: total < 2 }
})

let mermaidModule: ReturnType<typeof loadMermaid> | undefined
let mermaidRenderId = 0

function loadMermaid() {
  return import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default' })
    return mermaid
  })
}

function showMermaidError(pre: HTMLPreElement) {
  const message = document.createElement('p')
  message.className = 'mermaid-error'
  message.setAttribute('role', 'status')
  message.textContent = 'Mermaid図を表示できませんでした。図の記法を確認してください。'
  pre.insertAdjacentElement('beforebegin', message)
}

async function renderMermaid() {
  const root = article.value
  const codeBlocks = Array.from(root?.querySelectorAll('pre code.language-mermaid') ?? [])
  if (!root || !codeBlocks.length) return

  try {
    const mermaid = await (mermaidModule ??= loadMermaid())
    for (const code of codeBlocks) {
      const pre = code.closest('pre')
      if (!pre || !root.contains(pre)) continue

      try {
        const { svg, bindFunctions } = await mermaid.render(
          `ka2-mermaid-${++mermaidRenderId}`,
          code.textContent ?? '',
        )
        if (!root.contains(pre)) continue

        const diagram = document.createElement('div')
        diagram.className = 'mermaid-diagram'
        diagram.innerHTML = svg
        pre.replaceWith(diagram)
        bindFunctions?.(diagram)
      }
      catch (error) {
        console.error('Failed to render a Mermaid diagram.', error)
        showMermaidError(pre)
      }
    }
  }
  catch (error) {
    console.error('Failed to load the Mermaid renderer.', error)
    for (const code of codeBlocks) {
      const pre = code.closest('pre')
      if (pre && root.contains(pre)) showMermaidError(pre)
    }
  }
}

onMounted(renderMermaid)
watch(() => props.post.html, async () => {
  await nextTick()
  await renderMermaid()
})
</script>

<template>
  <article ref="article">
    <header>
      <p class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-500">
        <time :datetime="post.date">{{ post.date.slice(0, 10) }}</time>
        <NuxtLink
          v-for="c in post.categories"
          :key="c.slug"
          :to="`/${c.slug}`"
          class="rounded-full border border-cyan-600/40 bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
        >{{ c.name }}</NuxtLink>
      </p>
      <h1 class="mt-1 text-2xl font-bold leading-snug">{{ post.title }}</h1>
    </header>
    <template v-for="(b, i) in blocks.blocks" :key="i">
      <AdSlot v-if="b.ad" class="my-8" />
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="prose prose-slate dark:prose-invert max-w-none break-words [&_h2]:mt-[1.25em] [&_h2]:border-b [&_h2]:border-dashed [&_h2]:border-[#ccc] [&_h2]:pb-[0.1em] dark:[&_h2]:border-slate-300 [&_p]:mx-auto [&_p]:mt-0 [&_p]:mb-[1em]" :class="i === 0 ? 'mt-6' : ''" v-html="b.html" />
    </template>
    <AdSlot v-if="blocks.tailAd" class="mt-8" />
    <ul v-if="post.tags.length" class="mt-6 flex flex-wrap gap-2 text-xs text-slate-600">
      <li v-for="t in post.tags" :key="t.slug" class="rounded bg-slate-100 px-2 py-1">{{ t.name }}</li>
    </ul>
    <nav class="mt-8 grid gap-3 text-sm sm:grid-cols-2">
      <NuxtLink v-if="post.prev" :to="`/${post.prev.slug}`" class="rounded border border-slate-200 p-3">&larr; {{ post.prev.title }}</NuxtLink>
      <NuxtLink v-if="post.next" :to="`/${post.next.slug}`" class="rounded border border-slate-200 p-3 sm:col-start-2 sm:text-right">{{ post.next.title }} &rarr;</NuxtLink>
    </nav>
    <AdSlot class="mt-8" />
    <section v-if="post.related.length" class="mt-10">
      <h2 class="text-lg font-bold">関連記事</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <PostCard v-for="r in post.related" :key="r.slug" :post="r" />
      </div>
    </section>
  </article>
</template>
