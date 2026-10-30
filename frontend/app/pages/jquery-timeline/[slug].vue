<script setup lang="ts">
const slug = useRoute().params.slug as string
const { data, error } = await useFetch(`/api/doc/${slug}`)
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true })
</script>

<template>
  <DocView v-if="data" :doc="data" :path="`/jquery-timeline/${slug}`" />
</template>
