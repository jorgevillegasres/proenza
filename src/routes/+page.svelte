<script>
  import { onMount } from 'svelte'
  import Seo from '$lib/components/Seo.svelte'
  import OfficeDemo from '$lib/demo/OfficeDemo.svelte'
  import { site } from '$lib/data/site.js'
  import cityUrl from '$lib/assets/demo/city.webp'
  import envUrl from '$lib/assets/demo/office-env.jpg'
  import logoLightUrl from '$lib/assets/brand/logo-light.svg'

  let entered = $state(false)
  let enterBtn = $state(null)
  onMount(() => {
    const h = () => (entered = true)
    enterBtn?.addEventListener('click', h)
    return () => enterBtn?.removeEventListener('click', h)
  })
</script>

<Seo />

<OfficeDemo {cityUrl} {envUrl} />

<div class="welcome" class:gone={entered}>
    <span class="hud tl"></span><span class="hud tr"></span><span class="hud bl"></span><span class="hud br"></span>
    <div class="w-inner">
      <span class="eyebrow">Despacho jurídico · {site.city}</span>
      <img class="w-logo" src={logoLightUrl} alt={site.name} />
      <p class="w-tag">{site.tagline}</p>
      <button class="w-enter" bind:this={enterBtn}>
        Entrar al despacho
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
      <span class="w-hint">Recorre el despacho en primera persona · W/S avanzar · A/D girar</span>
    </div>
  </div>

<style>
  .welcome {
    position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; text-align: center;
    font-family: 'Inter', system-ui, sans-serif; color: #eaf3fb; padding: 2rem;
    background:
      radial-gradient(120% 90% at 50% 30%, rgba(20,38,64,0.7), transparent 70%),
      linear-gradient(160deg, rgba(6,12,24,0.97), rgba(4,9,18,0.99));
    opacity: 1; transition: opacity 0.55s ease;
  }
  .welcome.gone { opacity: 0; pointer-events: none; visibility: hidden; }
  .w-inner { display: grid; justify-items: center; gap: 1.1rem; max-width: 540px; position: relative; animation: wRise 0.7s cubic-bezier(0.16,0.84,0.3,1); }
  .eyebrow { font-size: 0.66rem; font-weight: 600; letter-spacing: 0.32em; text-transform: uppercase; color: #7fd3ff; }
  .w-logo { width: min(360px, 78vw); filter: drop-shadow(0 6px 24px rgba(60,150,255,0.25)); }
  .w-tag { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; font-size: 1.5rem; line-height: 1.35; color: #d8e6f3; margin: 0; max-width: 460px; }
  .w-enter {
    display: inline-flex; align-items: center; gap: 0.6rem; margin-top: 0.6rem;
    padding: 0.85rem 1.7rem; border-radius: 999px; cursor: pointer;
    font: inherit; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.03em; color: #04121f;
    border: 1px solid rgba(160,225,255,0.6);
    background: linear-gradient(180deg, rgba(120,210,255,0.96), rgba(70,150,235,0.96));
    box-shadow: 0 10px 34px rgba(50,140,235,0.45), inset 0 1px 0 rgba(255,255,255,0.5);
    transition: transform 0.16s, box-shadow 0.16s;
  }
  .w-enter:hover { transform: translateY(-2px); box-shadow: 0 16px 44px rgba(50,140,235,0.6), inset 0 1px 0 rgba(255,255,255,0.6); }
  .w-hint { font-size: 0.72rem; color: #8fa6bb; letter-spacing: 0.04em; margin-top: 0.3rem; }
  .hud { position: absolute; width: 26px; height: 26px; pointer-events: none; border: 1.5px solid rgba(125,215,255,0.6); }
  .hud.tl { top: 22px; left: 22px; border-right: 0; border-bottom: 0; border-top-left-radius: 8px; }
  .hud.tr { top: 22px; right: 22px; border-left: 0; border-bottom: 0; border-top-right-radius: 8px; }
  .hud.bl { bottom: 22px; left: 22px; border-right: 0; border-top: 0; border-bottom-left-radius: 8px; }
  .hud.br { bottom: 22px; right: 22px; border-left: 0; border-top: 0; border-bottom-right-radius: 8px; }
  @keyframes wRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  @media (max-width: 720px) { .w-tag { font-size: 1.2rem; } .hud { width: 18px; height: 18px; } }
</style>
