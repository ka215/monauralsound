<script setup lang="ts">
import type { Summary } from '../../server/utils/content-core'

// post.image は 16:9 のサムネイル
defineProps<{ post: Summary }>()
</script>

<template>
  <article class="h-full overflow-hidden rounded-lg border border-slate-200 bg-white">
    <NuxtLink :to="`/${post.slug}`" class="flex gap-3 p-3 sm:flex-col sm:gap-0 sm:p-0">
      <img
        v-if="post.image"
        :src="post.image"
        alt=""
        width="320"
        height="180"
        loading="lazy"
        class="size-20 shrink-0 rounded object-cover sm:aspect-video sm:size-auto sm:w-full sm:rounded-none"
      >
      <div class="min-w-0 sm:p-3">
        <h3 class="line-clamp-2 font-semibold leading-snug">{{ post.title }}</h3>
        <p class="mt-1 text-xs text-slate-500">
          {{ post.date.slice(0, 10) }}
          <span v-for="c in post.categories" :key="c.slug" class="ml-2">{{ c.name }}</span>
        </p>
        <p class="mt-1 line-clamp-2 hidden text-sm text-slate-600 sm:block">{{ post.excerpt }}</p>
      </div>
    </NuxtLink>
  </article>
</template>
