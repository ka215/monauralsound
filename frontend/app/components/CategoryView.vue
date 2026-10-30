<script setup lang="ts">
import type { CategoryEntry } from '../../server/utils/content-core'

const props = defineProps<{ category: CategoryEntry }>()
useSeo({ title: props.category.name, description: props.category.description || `${props.category.name}の記事一覧`, path: `/${props.category.slug}` })
</script>

<template>
  <section>
    <h1 class="text-2xl font-bold">{{ category.name }}</h1>
    <p v-if="category.description" class="mt-1 text-sm text-slate-600">{{ category.description }}</p>
    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <PostCard v-for="p in category.posts" :key="p.slug" :post="p" />
    </div>
  </section>
</template>
