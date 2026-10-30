<script setup lang="ts">
import type { SimpleDoc } from '../../server/utils/content-core'

const props = defineProps<{ doc: SimpleDoc, path: string }>()
useSeo({ title: props.doc.title, description: props.doc.excerpt || undefined, path: props.path })
</script>

<template>
  <article>
    <h1 class="text-2xl font-bold leading-snug">{{ doc.title }}</h1>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="prose prose-slate dark:prose-invert mt-6 max-w-none break-words" v-html="doc.html" />
  </article>
</template>
