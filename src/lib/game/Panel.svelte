<script>
  import AreaIcon from '$lib/components/AreaIcon.svelte'
  import { areas, getArea } from '$lib/data/areas.js'
  import { abogados, getAbogado, initials } from '$lib/data/abogados.js'
  import { posts, formatDate } from '$lib/data/posts.js'
  import { site, whatsappLink } from '$lib/data/site.js'

  let { section, onClose, onNavigate } = $props()

  // Sub-navegación dentro de un panel (área/abogado/artículo seleccionado).
  let sel = $state(null)
  let prevSection = null
  $effect(() => {
    if (section !== prevSection) {
      prevSection = section
      sel = null
    }
  })

  // Estado de formularios.
  let f = $state({ nombre: '', contacto: '', area: '', fecha: '', mensaje: '' })
  function citaWhats(e) {
    e?.preventDefault()
    const msg =
      `Hola, quiero agendar una cita.\n• Nombre: ${f.nombre || '—'}\n• Contacto: ${f.contacto || '—'}\n` +
      `• Área: ${f.area || '—'}\n• Fecha preferida: ${f.fecha || '—'}\n` +
      (f.mensaje ? `• Detalle: ${f.mensaje}\n` : '')
    window.open(whatsappLink(msg), '_blank', 'noopener')
  }
  function casoWhats(e) {
    e?.preventDefault()
    const msg =
      `Hola, quiero contarles mi caso.\n• Nombre: ${f.nombre || '—'}\n• Contacto: ${f.contacto || '—'}\n` +
      `• Área: ${f.area || '—'}\n• Caso: ${f.mensaje || '—'}\n`
    window.open(whatsappLink(msg), '_blank', 'noopener')
  }

  const titles = {
    recepcion: 'Bienvenido a Proenza Abogados',
    areas: 'Áreas de práctica',
    abogados: 'Nuestros abogados',
    blog: 'Biblioteca',
    agendar: 'Agenda tu cita',
    caso: 'Cuéntanos tu caso',
    contacto: 'Contacto',
  }
  const selArea = $derived(section === 'areas' && sel ? getArea(sel) : null)
  const selAbogado = $derived(section === 'abogados' && sel ? getAbogado(sel) : null)
  const selPost = $derived(section === 'blog' && sel ? posts.find((p) => p.slug === sel) : null)
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label={titles[section]}>
  <button class="scrim" aria-label="Cerrar" onclick={onClose}></button>

  <div class="sheet">
    <div class="sheet-head">
      <h2>{titles[section]}</h2>
      <button class="close" onclick={onClose} aria-label="Cerrar">✕</button>
    </div>

    <div class="sheet-body">
      <!-- RECEPCIÓN -->
      {#if section === 'recepcion'}
        <p class="lead">{site.tagline}</p>
        <p>Camina por el despacho y entra a cada zona, o salta directo:</p>
        <div class="quick">
          {#each [['areas', 'Áreas de práctica'], ['abogados', 'Nuestros abogados'], ['blog', 'Biblioteca'], ['agendar', 'Agenda tu cita'], ['caso', 'Cuéntanos tu caso'], ['contacto', 'Contacto']] as [id, label]}
            <button class="qbtn" onclick={() => onNavigate(id)}>{label}</button>
          {/each}
        </div>

      <!-- ÁREAS -->
      {:else if section === 'areas'}
        {#if !selArea}
          <div class="grid">
            {#each areas as a}
              <button class="card cardbtn" onclick={() => (sel = a.slug)}>
                <span class="ic"><AreaIcon name={a.icon} /></span>
                <h3>{a.name}</h3>
                <p>{a.summary}</p>
              </button>
            {/each}
          </div>
        {:else}
          <button class="back" onclick={() => (sel = null)}>← Todas las áreas</button>
          <div class="area-head">
            <span class="ic big"><AreaIcon name={selArea.icon} size={30} /></span>
            <h3>{selArea.name}</h3>
          </div>
          <p class="lead">{selArea.intro}</p>
          <h4>¿En qué te ayudamos?</h4>
          <ul class="services">
            {#each selArea.services as s}<li>{s}</li>{/each}
          </ul>
          <div class="row-cta">
            <button class="btn btn-primary" onclick={() => onNavigate('agendar')}>Agenda una cita</button>
            <a class="btn btn-ghost" href={whatsappLink(`Hola, necesito asesoría en ${selArea.name}.`)} target="_blank" rel="noopener">WhatsApp</a>
          </div>
        {/if}

      <!-- ABOGADOS -->
      {:else if section === 'abogados'}
        {#if !selAbogado}
          <div class="grid">
            {#each abogados as a}
              <button class="card cardbtn center" onclick={() => (sel = a.slug)}>
                <span class="avatar">{#if a.photo}<img src={a.photo} alt={a.name} />{:else}{initials(a.name)}{/if}</span>
                <h3>{a.name}</h3>
                <span class="role">{a.role}</span>
              </button>
            {/each}
          </div>
        {:else}
          <button class="back" onclick={() => (sel = null)}>← Todo el equipo</button>
          <div class="lawyer-head">
            <span class="avatar big">{#if selAbogado.photo}<img src={selAbogado.photo} alt={selAbogado.name} />{:else}{initials(selAbogado.name)}{/if}</span>
            <div>
              <h3>{selAbogado.name}</h3>
              <span class="role">{selAbogado.role}</span>
            </div>
          </div>
          <p class="lead">{selAbogado.bio}</p>
          <div class="chips">
            {#each selAbogado.areas.map(getArea).filter(Boolean) as ar}
              <button class="chip" onclick={() => onNavigate('areas')}>{ar.name}</button>
            {/each}
          </div>
          <div class="row-cta">
            <a class="btn btn-primary" href={`mailto:${selAbogado.email}`}>Escribir a {selAbogado.name.split(' ')[0]}</a>
          </div>
        {/if}

      <!-- BIBLIOTECA / BLOG -->
      {:else if section === 'blog'}
        {#if !selPost}
          <div class="grid">
            {#each posts as p}
              <button class="card cardbtn" onclick={() => (sel = p.slug)}>
                <span class="tag">{p.area}</span>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <span class="meta">{formatDate(p.date)} · {p.readingMinutes} min</span>
              </button>
            {/each}
          </div>
        {:else}
          {@const Article = selPost.component}
          <button class="back" onclick={() => (sel = null)}>← Biblioteca</button>
          <article class="prose">
            <h3>{selPost.title}</h3>
            <span class="meta">{formatDate(selPost.date)} · {selPost.readingMinutes} min de lectura</span>
            <Article />
          </article>
          <div class="row-cta">
            <button class="btn btn-primary" onclick={() => onNavigate('agendar')}>Agenda tu cita</button>
          </div>
        {/if}

      <!-- AGENDAR -->
      {:else if section === 'agendar'}
        <p class="lead">Cuéntanos tus datos y coordinamos la consulta.</p>
        <form class="form" onsubmit={citaWhats}>
          <div class="frow">
            <label>Nombre<input bind:value={f.nombre} required placeholder="Tu nombre" /></label>
            <label>Teléfono / WhatsApp<input bind:value={f.contacto} required placeholder="300 000 0000" /></label>
          </div>
          <div class="frow">
            <label>Área
              <select bind:value={f.area}>
                <option value="" disabled selected>Selecciona</option>
                {#each areas as a}<option value={a.name}>{a.name}</option>{/each}
              </select>
            </label>
            <label>Fecha preferida<input type="date" bind:value={f.fecha} /></label>
          </div>
          <label>Detalle (opcional)<textarea rows="3" bind:value={f.mensaje}></textarea></label>
          <div class="row-cta">
            <button class="btn btn-primary" type="submit">Enviar por WhatsApp</button>
          </div>
          <p class="legal">No constituye asesoría jurídica ni crea relación abogado–cliente hasta formalizar el servicio.</p>
        </form>

      <!-- CASO -->
      {:else if section === 'caso'}
        <p class="lead">Describe tu situación y te orientamos sobre los siguientes pasos.</p>
        <form class="form" onsubmit={casoWhats}>
          <div class="frow">
            <label>Nombre<input bind:value={f.nombre} required placeholder="Tu nombre" /></label>
            <label>Teléfono o correo<input bind:value={f.contacto} required placeholder="Cómo te contactamos" /></label>
          </div>
          <label>Área relacionada
            <select bind:value={f.area}>
              <option value="" disabled selected>Selecciona</option>
              {#each areas as a}<option value={a.name}>{a.name}</option>{/each}
              <option value="No estoy seguro">No estoy seguro</option>
            </select>
          </label>
          <label>Tu caso<textarea rows="5" bind:value={f.mensaje} required placeholder="Cuéntanos qué sucedió y qué buscas resolver."></textarea></label>
          <div class="row-cta">
            <button class="btn btn-primary" type="submit">Enviar por WhatsApp</button>
          </div>
          <p class="legal">Tratamos tu información con confidencialidad. No crea relación abogado–cliente hasta formalizar el servicio.</p>
        </form>

      <!-- CONTACTO -->
      {:else if section === 'contacto'}
        <p class="lead">Escríbenos por el canal que prefieras.</p>
        <ul class="contact">
          <li><b>WhatsApp</b><a href={whatsappLink()} target="_blank" rel="noopener">{site.phone}</a></li>
          <li><b>Correo</b><a href={`mailto:${site.email}`}>{site.email}</a></li>
          <li><b>Teléfono</b><a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a></li>
          <li><b>Dirección</b><span>{site.address}</span></li>
          <li><b>Horario</b><span>{site.hours}</span></li>
        </ul>
        <div class="row-cta">
          <a class="btn btn-primary" href={whatsappLink()} target="_blank" rel="noopener">Abrir WhatsApp</a>
          <button class="btn btn-ghost" onclick={() => onNavigate('agendar')}>Agenda tu cita</button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }
  .scrim {
    position: absolute;
    inset: 0;
    border: 0;
    background: rgba(8, 14, 30, 0.5);
    backdrop-filter: blur(3px);
    cursor: pointer;
  }
  .sheet {
    position: relative;
    width: min(760px, 100%);
    max-height: 86vh;
    background: var(--cream);
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -10px 60px rgba(8, 14, 30, 0.4);
    display: flex;
    flex-direction: column;
    animation: rise 0.28s cubic-bezier(0.2, 0.9, 0.3, 1);
  }
  @keyframes rise {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @media (min-width: 700px) {
    .overlay { align-items: center; }
    .sheet { border-radius: 20px; }
  }
  .sheet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.1rem 1.4rem;
    border-bottom: 1px solid var(--line);
  }
  .sheet-head h2 { margin: 0; font-size: 1.4rem; }
  .close {
    width: 38px; height: 38px; border-radius: 50%;
    border: 1px solid var(--line); background: #fff; cursor: pointer;
    font-size: 1rem; color: var(--text);
  }
  .close:hover { background: var(--sand); }
  .sheet-body { padding: 1.4rem; overflow-y: auto; }

  .lead { font-size: 1.08rem; color: var(--text); }
  .grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.9rem;
  }
  .cardbtn {
    text-align: left; cursor: pointer; padding: 1.1rem; border: 1px solid var(--line);
    background: var(--paper); border-radius: var(--radius); display: flex; flex-direction: column; gap: 0.35rem;
    font: inherit; color: var(--text); transition: transform 0.12s ease, box-shadow 0.18s ease;
  }
  .cardbtn:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .cardbtn.center { align-items: center; text-align: center; }
  .cardbtn h3 { margin: 0; font-size: 1.05rem; }
  .cardbtn p { margin: 0; font-size: 0.88rem; }
  .ic { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 11px; background: #eaf1fb; color: var(--brand); }
  .ic.big { width: 52px; height: 52px; }
  .area-head, .lawyer-head { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.4rem; }
  .area-head h3, .lawyer-head h3 { margin: 0; }
  .avatar {
    width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center;
    background: linear-gradient(150deg, var(--brand-bright), var(--ink)); color: #fff;
    font-family: var(--font-display); font-size: 1.3rem; overflow: hidden;
  }
  .avatar.big { width: 76px; height: 76px; font-size: 1.6rem; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .role { color: var(--brand); font-weight: 600; font-size: 0.85rem; }
  .back { background: none; border: 0; color: var(--brand); font-weight: 600; cursor: pointer; padding: 0 0 0.6rem; font: inherit; }
  .services { list-style: none; padding: 0; display: grid; gap: 0.5rem; }
  .services li { position: relative; padding-left: 1.6rem; }
  .services li::before { content: ''; position: absolute; left: 0; top: 0.45em; width: 10px; height: 10px; border-radius: 3px; background: var(--brand-bright); }
  .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.6rem 0; }
  .chip { background: #eaf1fb; color: var(--brand); border: 0; padding: 0.3rem 0.7rem; border-radius: 999px; font: inherit; font-size: 0.84rem; font-weight: 600; cursor: pointer; }
  .tag { align-self: flex-start; text-transform: capitalize; font-size: 0.72rem; font-weight: 600; color: var(--brand); background: #eaf1fb; padding: 0.15rem 0.55rem; border-radius: 999px; }
  .meta { font-size: 0.8rem; color: var(--warm-gray); }
  .row-cta { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 1.2rem; }

  .prose :global(h2) { font-size: 1.2rem; margin-top: 1.5rem; }
  .prose :global(blockquote) { margin: 1.2rem 0; padding: 0.7rem 1.1rem; border-left: 4px solid var(--gold); background: #fbf6ea; border-radius: 0 10px 10px 0; font-style: italic; color: var(--text-soft); }
  .prose :global(ul), .prose :global(ol) { padding-left: 1.3rem; }

  .form { display: grid; gap: 1rem; }
  .frow { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  label { display: grid; gap: 0.35rem; font-size: 0.86rem; font-weight: 600; color: var(--text); }
  input, select, textarea {
    font: inherit; font-weight: 400; padding: 0.65rem 0.8rem; border: 1px solid var(--line);
    border-radius: var(--radius-sm); background: #fff; color: var(--text); width: 100%;
  }
  input:focus, select:focus, textarea:focus { outline: 2px solid var(--brand-bright); outline-offset: 1px; }
  textarea { resize: vertical; }
  .legal { font-size: 0.78rem; color: var(--warm-gray); margin: 0; }

  .contact { list-style: none; padding: 0; display: grid; gap: 0.9rem; }
  .contact li { display: grid; }
  .contact b { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--brand); }
  .contact a, .contact span { font-size: 1.02rem; font-weight: 600; color: var(--text); }

  @media (max-width: 560px) {
    .frow { grid-template-columns: 1fr; }
  }
</style>
