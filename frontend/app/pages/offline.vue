<script setup lang="ts">
useSeo({ title: 'オフライン', path: '/offline' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template>
  <section class="py-10 text-center">
    <h1 class="text-2xl font-bold">オフラインです</h1>
    <p class="mt-3 text-slate-600">ネットワークに接続できません。接続を確認して、もう一度お試しください。</p>
    <button type="button" class="mt-6 rounded bg-slate-900 px-4 py-2 text-white" @click="$router.go(0)">再読み込み</button>
  </section>
</template>
