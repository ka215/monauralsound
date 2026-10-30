<script setup lang="ts">
useSeo({ title: 'お問い合わせ', description: 'お問い合わせフォーム', path: '/contact' })

const { contactApi, turnstileSiteKey } = useRuntimeConfig().public

type Field = 'name' | 'email' | 'subject' | 'message'
const form = reactive<Record<Field, string>>({ name: '', email: '', subject: '', message: '' })
const website = ref('') // ハニーポット。人間には見えない
const token = ref('')
const status = ref<'idle' | 'sending' | 'done'>('idle')
const errors = ref<Partial<Record<Field, string>>>({})
const formError = ref('')
const widget = useTemplateRef<HTMLElement>('widget')

interface Turnstile {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
}
let widgetId: string | undefined
const turnstile = () => (window as unknown as { turnstile?: Turnstile }).turnstile

function renderWidget() {
  const t = turnstile()
  if (!t || !widget.value || widgetId) return
  widgetId = t.render(widget.value, {
    sitekey: turnstileSiteKey,
    theme: 'auto',
    language: 'ja',
    callback: (v: string) => { token.value = v },
    'expired-callback': () => { token.value = '' },
    'error-callback': () => { token.value = '' },
  })
}

onMounted(() => {
  if (turnstile()) return renderWidget()
  const s = document.createElement('script')
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  s.async = true
  s.onload = renderWidget
  document.head.appendChild(s)
})

function validate(): boolean {
  const e: typeof errors.value = {}
  if (!form.name.trim()) e.name = 'お名前を入力してください。'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'メールアドレスの形式が正しくありません。'
  if (!form.subject.trim()) e.subject = '件名を入力してください。'
  if (!form.message.trim()) e.message = '内容を入力してください。'
  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  formError.value = ''
  if (!validate()) return
  if (!token.value) {
    formError.value = '「私はロボットではありません」の確認が完了するまでお待ちください。'
    return
  }
  status.value = 'sending'
  try {
    await $fetch(contactApi, {
      method: 'POST',
      body: { ...form, website: website.value, turnstile_token: token.value },
    })
    status.value = 'done'
  }
  catch (err) {
    status.value = 'idle'
    const data = (err as { data?: { message?: string, data?: { fields?: Partial<Record<Field, string>> } } }).data
    if (data?.data?.fields) errors.value = data.data.fields
    formError.value = data?.message ?? '送信に失敗しました。通信状況を確認して、もう一度お試しください。'
    // トークンは 1 回限り有効
    token.value = ''
    if (widgetId) turnstile()?.reset(widgetId)
  }
}

const fields = [
  { key: 'name', label: '名前', type: 'text', auto: 'name' },
  { key: 'email', label: 'メールアドレス', type: 'email', auto: 'email' },
  { key: 'subject', label: '件名', type: 'text', auto: 'off' },
] as const

const inputClass = 'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600'
</script>

<template>
  <section class="mx-auto max-w-xl">
    <h1 class="text-2xl font-bold">お問い合わせ</h1>
    <p class="mt-3 text-sm text-slate-600">
      ご質問やご連絡は、以下のフォームからお送りください。内容によっては返信できない場合があります。
      送信内容の取り扱いは<NuxtLink to="/privacy-policy" class="text-cyan-700 underline dark:text-cyan-300">プライバシーポリシー</NuxtLink>をご確認ください。
    </p>

    <div v-if="status === 'done'" role="status" class="mt-6 rounded-md border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
      送信しました。お問い合わせありがとうございます。
    </div>

    <form v-else class="mt-6 space-y-5" novalidate @submit.prevent="submit">
      <div v-for="f in fields" :key="f.key">
        <label :for="`f-${f.key}`" class="block text-sm font-bold">{{ f.label }}<span class="ml-1 text-red-600">*</span></label>
        <input
          :id="`f-${f.key}`"
          v-model="form[f.key]"
          :type="f.type"
          :autocomplete="f.auto"
          maxlength="200"
          required
          :aria-invalid="!!errors[f.key]"
          :aria-describedby="errors[f.key] ? `e-${f.key}` : undefined"
          :class="inputClass"
        >
        <p v-if="errors[f.key]" :id="`e-${f.key}`" class="mt-1 text-sm text-red-600">{{ errors[f.key] }}</p>
      </div>
      <div>
        <label for="f-message" class="block text-sm font-bold">内容<span class="ml-1 text-red-600">*</span></label>
        <textarea
          id="f-message"
          v-model="form.message"
          rows="8"
          maxlength="5000"
          required
          :aria-invalid="!!errors.message"
          :aria-describedby="errors.message ? 'e-message' : undefined"
          :class="inputClass"
        />
        <p v-if="errors.message" id="e-message" class="mt-1 text-sm text-red-600">{{ errors.message }}</p>
      </div>

      <div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>Website<input v-model="website" type="text" tabindex="-1" autocomplete="off"></label>
      </div>

      <div ref="widget" class="min-h-[65px]" />

      <p v-if="formError" role="alert" class="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{{ formError }}</p>

      <button
        type="submit"
        :disabled="status === 'sending'"
        class="h-12 w-full rounded-md bg-cyan-700 font-bold text-white transition-colors hover:bg-cyan-800 disabled:opacity-60"
      >
        {{ status === 'sending' ? '送信中…' : '送信する' }}
      </button>
    </form>
  </section>
</template>
