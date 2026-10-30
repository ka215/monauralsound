<script setup lang="ts">
import type { Entry } from '../../server/api/entry/[slug].get'

const route = useRoute()
const slug = route.params.slug as string
const { data, error } = await useFetch<Entry>(`/api/entry/${encodeURIComponent(slug)}`)
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true })
</script>

<template>
  <ArticleView v-if="data?.type === 'post'" :post="data.post" />
  <CategoryView v-else-if="data?.type === 'category'" :category="data.category" />
  <DocView v-else-if="data?.type === 'page'" :doc="data.page" :path="`/${slug}`" />
</template>
