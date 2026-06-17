<script>
  import { page } from '$app/state'
</script>

<section class="err">
  <div class="container">
    <span class="code">{page.status}</span>
    <h1>{page.status === 404 ? 'Esta sala no existe' : 'Algo salió mal'}</h1>
    <p>{page.error?.message || 'No pudimos encontrar lo que buscabas.'}</p>
    <a class="btn btn-primary" href="/">Volver a la recepción</a>
  </div>
</section>

<style>
  .err {
    text-align: center;
    padding-block: clamp(4rem, 12vw, 8rem);
  }
  .code {
    font-family: var(--font-display);
    font-size: clamp(3rem, 12vw, 6rem);
    color: var(--brand-bright);
    line-height: 1;
  }
</style>
