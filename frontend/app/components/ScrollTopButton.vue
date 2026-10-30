<script setup lang="ts">
const visible = ref(false)

function update() {
  visible.value = window.scrollY > 300
}

function toTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

onMounted(() => {
  update()
  window.addEventListener('scroll', update, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', update))
</script>

<template>
  <button
    type="button"
    aria-label="ページの先頭へ戻る"
    class="fixed right-4 z-30 flex size-12 items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg transition-opacity duration-200"
    :class="visible ? 'opacity-90' : 'pointer-events-none opacity-0'"
    :style="{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }"
    :tabindex="visible ? 0 : -1"
    :aria-hidden="!visible"
    @click="toTop"
  >
    <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 15l6-6 6 6" />
    </svg>
  </button>
</template>
