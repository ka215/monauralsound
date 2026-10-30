<script setup lang="ts">
const props = defineProps<{ slotId?: string }>()
const { adsenseClient, adsenseSlot, adsenseDebug } = useRuntimeConfig().public
const slotId = props.slotId || adsenseSlot
const el = useTemplateRef<HTMLElement>('el')

onMounted(() => {
  if (adsenseDebug || !adsenseClient || !slotId) return
  try {
    const w = window as unknown as { adsbygoogle?: unknown[] }
    ;(w.adsbygoogle = w.adsbygoogle || []).push({})
  }
  catch {
    el.value?.remove()
  }
})
</script>

<template>
  <div
    v-if="adsenseDebug"
    class="flex min-h-[100px] items-center justify-center rounded border border-dashed border-slate-400 bg-slate-100 text-sm text-slate-500"
  >
    広告(ダミー) slot: {{ slotId || '未設定' }}
  </div>
  <ins
    v-else-if="adsenseClient && slotId"
    ref="el"
    class="adsbygoogle block min-h-[100px]"
    :data-ad-client="adsenseClient"
    :data-ad-slot="slotId"
    data-ad-format="auto"
    data-full-width-responsive="true"
  />
</template>
