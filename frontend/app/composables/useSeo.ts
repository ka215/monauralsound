export function useSeo(opts: { title: string, description?: string, path: string, image?: string | null, type?: 'website' | 'article' }) {
  const { siteUrl, siteName } = useRuntimeConfig().public
  const url = siteUrl + (opts.path === '/' ? '' : opts.path)
  const title = opts.path === '/' ? siteName : `${opts.title} | ${siteName}`
  const image = opts.image ? siteUrl + opts.image : `${siteUrl}/icon-512.png`
  useSeoMeta({
    title,
    description: opts.description,
    ogTitle: title,
    ogDescription: opts.description,
    ogType: opts.type ?? 'website',
    ogUrl: url,
    ogImage: image,
    ogSiteName: siteName,
    twitterCard: 'summary_large_image',
  })
  useHead({ link: [{ rel: 'canonical', href: url }] })
}
