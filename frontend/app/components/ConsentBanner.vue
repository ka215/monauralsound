<script setup lang="ts">
const consent = useConsent()
// SSG の HTML には含めず、マウント後にだけ表示する(ハイドレーション不一致の回避)
const mounted = ref(false)
onMounted(() => { mounted.value = true })
</script>

<template>
  <div
    v-if="mounted && consent.bannerOpen.value"
    role="dialog"
    aria-label="Cookie の利用について"
    class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-4 shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]"
  >
    <div class="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
      <p class="text-sm text-slate-700">
        アクセス解析(Google アナリティクス)とパーソナライズ広告のために Cookie を使用します。同意しない場合、解析は行わず、広告は非パーソナライズで表示します。
        <NuxtLink to="/privacy-policy" class="underline">プライバシーポリシー</NuxtLink>
      </p>
      <div class="flex shrink-0 gap-2">
        <button type="button" class="flex-1 rounded border border-slate-300 px-4 py-2 text-sm sm:flex-none" @click="consent.set('denied')">同意しない</button>
        <button type="button" class="flex-1 rounded bg-slate-900 px-4 py-2 text-sm text-white sm:flex-none" @click="consent.set('granted')">同意する</button>
      </div>
    </div>
  </div>
</template>
