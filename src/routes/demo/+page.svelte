<script>
  import Seo from '$lib/components/Seo.svelte'
  import OfficeDemo from '$lib/demo/OfficeDemo.svelte'
  import cityUrl from '$lib/assets/demo/city.jpg'
  import envUrl from '$lib/assets/demo/office-env.jpg'
</script>

<Seo title="Demo · oficina realista" />

<OfficeDemo {cityUrl} {envUrl} />
