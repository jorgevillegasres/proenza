<script>
  import { page } from '$app/state'
  import { site } from '$lib/data/site.js'

  let { title, description = site.description, type = 'website' } = $props()

  const fullTitle = $derived(title ? `${title} · ${site.name}` : `${site.name} — ${site.tagline}`)
  const url = $derived(page.url.href)
</script>

<svelte:head>
  <title>{fullTitle}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={url} />
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content={type} />
  <meta property="og:locale" content="es_CO" />
  <meta property="og:site_name" content={site.name} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={fullTitle} />
  <meta name="twitter:description" content={description} />
</svelte:head>
