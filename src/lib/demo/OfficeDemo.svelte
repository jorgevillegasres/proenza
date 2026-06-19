<script>
  import { onMount } from 'svelte'
  import { site, whatsappLink } from '$lib/data/site.js'
  import { abogados, initials } from '$lib/data/abogados.js'
  import { posts, formatDate } from '$lib/data/posts.js'

  let { cityUrl = '', envUrl = '' } = $props()

  let canvas = $state(null)
  let ready = $state(false)
  let failed = $state(false)

  // HUD reactivo
  let active = $state(null) // estación cercana {id,label,type,...}
  let open = $state(null) // estación abierta (panel)
  let discovered = $state([]) // ids visitados
  let toast = $state('')
  let stationsUI = $state([])

  // Estaciones del despacho (la geometría se construye en onMount).
  const STATIONS = [
    ...abogados.map((a, i) => ({
      id: a.slug,
      type: 'office',
      label: `${a.name}`,
      sub: a.role,
      lawyer: a,
      z: 6.5 - i * 3.5, // 6.5, 3, -0.5, -4
    })),
    { id: 'recepcion', type: 'reception', label: 'Recepción', sub: 'Deja tu caso para análisis', z: -8, center: true },
    { id: 'biblioteca', type: 'library', label: 'Biblioteca', sub: 'Artículos y blog', z: 8.5, right: true },
  ]
  stationsUI = STATIONS.map((s) => ({ id: s.id, label: s.label, type: s.type }))

  function openStation(s) {
    open = s
    if (s && !discovered.includes(s.id)) discovered = [...discovered, s.id]
  }
  function closeStation() { open = null }
  function showToast(msg) { toast = msg; setTimeout(() => (toast = msg === toast ? '' : toast), 3500) }

  // formularios
  let f = $state({ nombre: '', contacto: '', fecha: '', mensaje: '' })
  function citaWhats(e, lawyer) {
    e?.preventDefault()
    const msg = `Hola, quiero agendar una cita con ${lawyer.name} (${lawyer.role}).\n• Nombre: ${f.nombre || '—'}\n• Contacto: ${f.contacto || '—'}\n• Fecha: ${f.fecha || '—'}\n` + (f.mensaje ? `• Detalle: ${f.mensaje}\n` : '')
    globalThis.open(whatsappLink(msg), '_blank', 'noopener')
  }
  function casoWhats(e) {
    e?.preventDefault()
    const msg = `Hola, quiero dejar mi caso para análisis.\n• Nombre: ${f.nombre || '—'}\n• Contacto: ${f.contacto || '—'}\n• Caso: ${f.mensaje || '—'}\n`
    globalThis.open(whatsappLink(msg), '_blank', 'noopener')
  }
  let selPost = $state(null)

  // Teclas (compartidas con los botones táctiles).
  const keys = new Set()
  function hold(k, on) {
    if (on) keys.add(k)
    else keys.delete(k)
  }

  onMount(() => {
    let cleanup = () => {}
    let cancelled = false
    ;(async () => {
      let THREE
      try { THREE = await import('three') } catch { failed = true; return }
      if (cancelled) return

      let renderer
      try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); if (!renderer.getContext()) throw 0 } catch { failed = true; return }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 0.82

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xcdd6df)
      const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 300)

      // IBL desde el panorama de oficina
      if (envUrl) {
        const pmrem = new THREE.PMREMGenerator(renderer)
        pmrem.compileEquirectangularShader()
        new THREE.TextureLoader().load(envUrl, (tex) => {
          tex.mapping = THREE.EquirectangularReflectionMapping
          tex.colorSpace = THREE.SRGBColorSpace
          scene.environment = pmrem.fromEquirectangular(tex).texture
          if ('environmentIntensity' in scene) scene.environmentIntensity = 0.65
          tex.dispose(); pmrem.dispose()
        })
      }

      const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, ...o })
      const M = {
        floor: mat(0xacb2b8, { roughness: 0.18 }),
        wall: mat(0xe6e4df, { roughness: 0.92 }),
        ceil: mat(0xe2e1dd, { roughness: 1 }),
        wood: mat(0x4a2f1d, { roughness: 0.45, metalness: 0.1 }),
        deskTop: mat(0x2a1c12, { roughness: 0.3 }),
        glass: new THREE.MeshStandardMaterial({ color: 0xcfe0ec, roughness: 0.05, transparent: true, opacity: 0.16 }),
        frame: mat(0x20242a, { roughness: 0.6, metalness: 0.4 }),
        dark: mat(0x14171b, { roughness: 0.5 }),
        line: new THREE.MeshStandardMaterial({ color: 0xeaf6ff, emissive: 0x9fd4ff, emissiveIntensity: 2.2 }),
        lamp: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d8, emissiveIntensity: 3 }),
      }

      const HALL_Z0 = -9.2, HALL_Z1 = 11, H = 3.3, X_L = -2.2, X_R = 2.2, X_LBACK = -7.5
      const grp = new THREE.Group(); scene.add(grp)
      const addM = (m, cast = true, rec = true) => { m.castShadow = cast; m.receiveShadow = rec; grp.add(m); return m }
      const box = (w, h, d, material, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); m.rotation.y = ry; return addM(m) }
      const planeM = (w, h, material, x, y, z, rx = 0, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); return addM(m, false, true) }

      const totalZ = HALL_Z1 - HALL_Z0
      const midZ = (HALL_Z0 + HALL_Z1) / 2
      // piso + techo
      planeM(X_R - X_LBACK + 4, totalZ, M.floor, (X_R + X_LBACK) / 2, 0, midZ, -Math.PI / 2)
      planeM(X_R - X_LBACK + 4, totalZ, M.ceil, (X_R + X_LBACK) / 2, H, midZ, Math.PI / 2)
      // pared de entrada (frente) y back-left
      planeM(X_R - X_LBACK, H, M.wall, (X_R + X_LBACK) / 2, H / 2, HALL_Z1, 0, Math.PI)
      planeM(X_R - X_LBACK, H, M.wall, (X_R + X_LBACK) / 2, H / 2, HALL_Z0 + 0.01, 0, 0)
      planeM(totalZ, H, M.wall, X_LBACK, H / 2, midZ, 0, Math.PI / 2) // pared izquierda exterior
      // zócalos
      box(0.05, 0.12, totalZ, M.dark, X_LBACK + 0.03, 0.06, midZ)
      box(X_R - X_LBACK, 0.12, 0.05, M.dark, (X_R + X_LBACK) / 2, 0.06, HALL_Z0 + 0.05)
      box(X_R - X_LBACK, 0.12, 0.05, M.dark, (X_R + X_LBACK) / 2, 0.06, HALL_Z1 - 0.05)

      // --- ventanal derecho con la ciudad ------------------------------------
      const cityMat = new THREE.MeshBasicMaterial({ color: 0xbcd3e6 })
      if (cityUrl) { const t = new THREE.TextureLoader().load(cityUrl); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.x = 2.5; cityMat.map = t }
      planeM(totalZ * 2.4, H * 1.7, cityMat, X_R + 3, H / 2 + 0.2, midZ, 0, -Math.PI / 2)
      planeM(totalZ, H, M.glass, X_R - 0.02, H / 2, midZ, 0, -Math.PI / 2)
      for (let z = HALL_Z0; z <= HALL_Z1; z += 2.2) box(0.07, H, 0.07, M.frame, X_R - 0.03, H / 2, z)
      planeM(totalZ, 0.14, M.frame, X_R - 0.03, 0.07, midZ, -Math.PI / 2)
      planeM(totalZ, 0.14, M.frame, X_R - 0.03, H - 0.07, midZ, -Math.PI / 2)

      // --- luces de techo ----------------------------------------------------
      for (let z = HALL_Z0 + 2; z < HALL_Z1; z += 3.2) {
        box(0.25, 0.05, 1.6, M.lamp, 0, H - 0.04, z)
        const pl = new THREE.PointLight(0xfff2de, 6, 12, 2); pl.position.set(0, H - 0.4, z); grp.add(pl)
      }
      const day = new THREE.DirectionalLight(0xfff6e8, 1.5); day.position.set(20, 12, 6); day.castShadow = true
      day.shadow.mapSize.set(2048, 2048); day.shadow.camera.near = 1; day.shadow.camera.far = 80
      Object.assign(day.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14 }); day.shadow.bias = -0.0005
      grp.add(day, day.target)
      grp.add(new THREE.AmbientLight(0xffffff, 0.06))

      // --- letrero de canvas reutilizable ------------------------------------
      const textSign = (line1, line2, w, h, em = 0xffe9c0) => {
        const c = document.createElement('canvas'); c.width = 1024; c.height = 256
        const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height)
        g.fillStyle = '#fff7e6'; g.textAlign = 'center'; g.textBaseline = 'middle'
        g.font = '700 96px Georgia, serif'; g.fillText(line1, c.width / 2, line2 ? 95 : 128)
        if (line2) { g.font = '500 54px Georgia, serif'; g.fillText(line2, c.width / 2, 185) }
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: em, emissiveMap: tex, emissiveIntensity: 1.5, transparent: true }))
        return m
      }

      // --- recepción (fondo) -------------------------------------------------
      planeM(X_R - X_LBACK, H, M.wood, (X_R + X_LBACK) / 2 + 1.5, H / 2, HALL_Z0 + 0.02, 0, 0) // muro de madera
      { const sign = textSign('PROENZA', 'ABOGADOS', 3.4, 0.9); sign.position.set(-1.2, 2.0, HALL_Z0 + 0.06); grp.add(sign) }
      { // mostrador de mármol
        const counter = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.05, 0.9), mat(0xd9dde2, { roughness: 0.2 }))
        counter.position.set(-1.2, 0.525, HALL_Z0 + 1.5); counter.castShadow = counter.receiveShadow = true; grp.add(counter)
        box(3.6, 0.08, 1.05, M.deskTop, -1.2, 1.08, HALL_Z0 + 1.5)
      }

      // --- oficinas (lado izquierdo) -----------------------------------------
      const proxPoints = []
      for (const s of STATIONS.filter((x) => x.type === 'office')) {
        const zc = s.z, hd = 1.55
        // particiones laterales + fondo + frente de vidrio
        box(X_L - X_LBACK, H, 0.08, M.wall, (X_L + X_LBACK) / 2, H / 2, zc - hd)
        box(X_L - X_LBACK, H, 0.08, M.wall, (X_L + X_LBACK) / 2, H / 2, zc + hd)
        planeM(2 * hd, H, M.glass, X_L, H / 2, zc, 0, Math.PI / 2) // vidrio al pasillo
        box(0.06, H, 0.06, M.frame, X_L, H / 2, zc - hd)
        box(0.06, H, 0.06, M.frame, X_L, H / 2, zc + hd)
        // escritorio + silla dentro
        const desk = box(1.6, 0.9, 0.75, M.wood, X_L - 2.2, 0.45, zc, Math.PI / 2)
        box(1.75, 0.06, 0.9, M.deskTop, X_L - 2.2, 0.92, zc, Math.PI / 2)
        const ch = new THREE.Group(); ch.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), M.dark).translateY(0.46)); ch.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.08), M.dark).translateY(0.75).translateZ(-0.22)); ch.position.set(X_L - 3.0, 0, zc); ch.rotation.y = Math.PI / 2; grp.add(ch)
        // detalle interior: monitor, planta de esquina, diploma en la pared
        box(0.5, 0.3, 0.04, M.dark, X_L - 2.4, 1.18, zc, Math.PI / 2)
        box(0.14, 0.16, 0.1, M.dark, X_L - 2.3, 1.0, zc)
        { const fol = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), mat(0x2f6f43)); fol.position.set(X_LBACK + 0.55, 0.62, zc + 1.05); fol.scale.y = 1.35; grp.add(fol); box(0.26, 0.34, 0.26, M.dark, X_LBACK + 0.55, 0.17, zc + 1.05) }
        box(0.45, 0.6, 0.04, mat(0xc6a05a, { metalness: 0.25, roughness: 0.4 }), X_LBACK + 0.05, 1.75, zc - 0.7, Math.PI / 2)
        // letrero colgante con el nombre
        const sign = textSign(s.label.toUpperCase(), s.sub, 2.4, 0.62, 0x8fd0ff)
        sign.position.set(X_L + 0.04, 2.25, zc); sign.rotation.y = Math.PI / 2; grp.add(sign)
        const bar = box(0.02, 0.5, 0.02, M.frame, X_L + 0.04, 2.7, zc); void bar
        proxPoints.push({ s, x: X_L + 0.9, z: zc })
      }

      // --- biblioteca (lado derecho, cerca de la entrada) --------------------
      {
        const zc = 8.5
        box(0.5, 2.6, 3.0, M.wood, X_R - 0.4, 1.3, zc) // mueble de fondo
        for (let i = 0; i < 4; i++) box(0.42, 0.08, 2.8, M.deskTop, X_R - 0.4, 0.6 + i * 0.6, zc)
        for (let i = 0; i < 4; i++) for (let j = 0; j < 9; j++) { const cc = [0x6b4a2b, 0x355c7d, 0x99403a, 0x3f6f4f, 0x7a5aa0][(i + j) % 5]; box(0.16, 0.42, 0.14, mat(cc), X_R - 0.62, 0.85 + i * 0.6, zc - 1.3 + j * 0.32) }
        const sign = textSign('BIBLIOTECA', 'Blog jurídico', 2.0, 0.55, 0x8fd0ff)
        sign.position.set(X_R - 0.05, 2.25, zc); sign.rotation.y = -Math.PI / 2; grp.add(sign)
        proxPoints.push({ s: STATIONS.find((x) => x.id === 'biblioteca'), x: X_R - 1.1, z: zc })
      }
      // recepción punto de proximidad
      proxPoints.push({ s: STATIONS.find((x) => x.id === 'recepcion'), x: -1.2, z: HALL_Z0 + 3.0 })

      // --- líneas guía luminosas en el piso ----------------------------------
      box(0.12, 0.02, totalZ - 1, M.line, 0, 0.02, midZ) // línea central
      for (const p of proxPoints) box(Math.abs(p.x) + 1.6, 0.02, 0.12, M.line, p.x / 2, 0.02, p.z) // ramales

      // --- easter eggs -------------------------------------------------------
      // 1) Taza de café del Dr. Villegas (el informático) — el dev.
      const egg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.1, 12), mat(0x222222))
      egg1.position.set(X_L - 1.8, 0.98, -4 + 0.4); egg1.userData.egg = 'Café del Dr. Villegas: "// TODO: ganar el caso". ☕💻'; grp.add(egg1)
      // 2) Gato escondido tras la recepción
      const egg2 = new THREE.Group()
      egg2.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), mat(0x33312f)))
      egg2.add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), mat(0x33312f)).translateY(0.12).translateX(-0.05))
      egg2.add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), mat(0x33312f)).translateY(0.12).translateX(0.05))
      egg2.position.set(-2.6, 0.12, HALL_Z0 + 1.0); egg2.userData.egg = '🐱 Encontraste a "Habeas", el gato del despacho.'; grp.add(egg2)
      // 3) Pato de goma en el mostrador
      const egg3 = new THREE.Group()
      egg3.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), mat(0xf4c430)))
      egg3.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), mat(0xf4c430)).translateY(0.1).translateZ(0.05))
      egg3.add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 8), mat(0xe8732a)).translateY(0.1).translateZ(0.13).rotateX(Math.PI / 2))
      egg3.position.set(-0.2, 1.18, HALL_Z0 + 1.5); egg3.userData.egg = '🦆 El pato de goma — el verdadero socio principal del despacho.'; grp.add(egg3)
      const eggs = [egg1, egg2, egg3]

      // --- primera persona ---------------------------------------------------
      const eye = 1.62
      const cpos = new THREE.Vector3(0, eye, HALL_Z1 - 1.5)
      let yaw = 0, pitch = -0.03
      const onKD = (e) => { const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', ' '].includes(k)) e.preventDefault(); if (k === 'escape') { closeStation(); return } if (open) return; if (k === 'e' && active) { openStation(STATIONS.find((x) => x.id === active.id)); return } keys.add(k) }
      const onKU = (e) => keys.delete(e.key.toLowerCase())
      addEventListener('keydown', onKD); addEventListener('keyup', onKU)
      let dragging = false, lx = 0, ly = 0
      const down = (x, y) => { if (open) return; dragging = true; lx = x; ly = y }
      const lookm = (x, y) => { if (!dragging) return; yaw -= (x - lx) * 0.0026; pitch = Math.max(-1.0, Math.min(0.85, pitch - (y - ly) * 0.0026)); lx = x; ly = y }
      const upp = () => { dragging = false }
      const md = (e) => down(e.clientX, e.clientY), mm = (e) => lookm(e.clientX, e.clientY)
      const ts = (e) => { const t = e.touches[0]; down(t.clientX, t.clientY) }, tm = (e) => { const t = e.touches[0]; lookm(t.clientX, t.clientY) }
      canvas.addEventListener('mousedown', md); addEventListener('mousemove', mm); addEventListener('mouseup', upp)
      canvas.addEventListener('touchstart', ts, { passive: true }); canvas.addEventListener('touchmove', tm, { passive: true }); canvas.addEventListener('touchend', upp)
      // click → interactuar con estación o easter egg
      const ray = new THREE.Raycaster()
      const onClick = (e) => {
        if (open) return
        if (active) { openStation(STATIONS.find((x) => x.id === active.id)); return }
        const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
        ray.setFromCamera(ndc, camera)
        const hit = ray.intersectObjects(eggs, true)[0]
        if (hit) { let o = hit.object; while (o && !o.userData.egg) o = o.parent; if (o) showToast(o.userData.egg) }
      }
      canvas.addEventListener('click', onClick)

      const resize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); composer?.setSize(innerWidth, innerHeight) }

      // post (bloom suave)
      let composer = null
      try {
        const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
          import('three/examples/jsm/postprocessing/EffectComposer.js'),
          import('three/examples/jsm/postprocessing/RenderPass.js'),
          import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
          import('three/examples/jsm/postprocessing/OutputPass.js'),
        ])
        composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera))
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.6, 0.85)); composer.addPass(new OutputPass())
      } catch { composer = null }
      addEventListener('resize', resize); resize()

      const clock = new THREE.Clock(); let raf = 0
      const fwd = new THREE.Vector3(), rgt = new THREE.Vector3(), tv = new THREE.Vector3()
      function frame() {
        raf = requestAnimationFrame(frame)
        const dt = Math.min(clock.getDelta(), 0.05)
        if (!open) {
          // A/D giran la cámara; W/S avanzan/retroceden (intuitivo para un pasillo).
          let turn = 0, mz = 0
          if (keys.has('w') || keys.has('arrowup')) mz += 1
          if (keys.has('s') || keys.has('arrowdown')) mz -= 1
          if (keys.has('a') || keys.has('arrowleft')) turn += 1
          if (keys.has('d') || keys.has('arrowright')) turn -= 1
          yaw += turn * 1.9 * dt
          camera.rotation.order = 'YXZ'; camera.rotation.y = yaw; camera.rotation.x = pitch
          fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw))
          if (mz !== 0) {
            cpos.addScaledVector(fwd, mz * 3.4 * dt)
            cpos.x = Math.max(X_L + 0.5, Math.min(X_R - 0.5, cpos.x))
            cpos.z = Math.max(HALL_Z0 + 1.2, Math.min(HALL_Z1 - 0.6, cpos.z))
          }
          cpos.y = eye; camera.position.copy(cpos)
          // proximidad
          let best = null, bd = 2.6
          for (const p of proxPoints) { const d = Math.hypot(cpos.x - p.x, cpos.z - p.z); if (d < bd) { bd = d; best = p.s } }
          const cur = best ? { id: best.id, label: best.label, sub: best.sub, type: best.type } : null
          if ((cur?.id || null) !== (active?.id || null)) active = cur
        }
        if (composer) composer.render(); else renderer.render(scene, camera)
        if (!ready) ready = true
      }
      frame()

      cleanup = () => {
        cancelAnimationFrame(raf)
        removeEventListener('keydown', onKD); removeEventListener('keyup', onKU)
        removeEventListener('mousemove', mm); removeEventListener('mouseup', upp); removeEventListener('resize', resize)
        canvas.removeEventListener('mousedown', md); canvas.removeEventListener('touchstart', ts); canvas.removeEventListener('touchmove', tm); canvas.removeEventListener('touchend', upp); canvas.removeEventListener('click', onClick)
        composer?.dispose?.(); renderer.dispose()
      }
    })()
    return () => { cancelled = true; cleanup() }
  })
</script>

<div class="demo">
  {#if !failed}<canvas bind:this={canvas}></canvas>{/if}

  <header class="nav">
    <nav>INICIO · SERVICIOS · NUESTRO EQUIPO · CLIENTES · CONTACTO</nav>
    <div class="contact"><span>{site.phone}</span><span>{site.email}</span></div>
  </header>

  <!-- panel EXPLORE NUESTRO ESPACIO -->
  <aside class="explore">
    <h2>EXPLORE NUESTRO ESPACIO</h2>
    <p class="poi">Puntos de interés:</p>
    <ul>
      {#each stationsUI as s}
        <li class:done={discovered.includes(s.id)}>{discovered.includes(s.id) ? '✓' : '○'} {s.label}</li>
      {/each}
    </ul>
    <p class="next">Descubiertos: <b>{discovered.length}/{stationsUI.length}</b></p>
    {#if active}
      <button class="cta" onclick={() => openStation(STATIONS.find((x) => x.id === active.id))}>ENTRAR · {active.label}</button>
    {:else}
      <span class="cta ghost">Acércate a una zona…</span>
    {/if}
  </aside>

  {#if active && !open}
    <div class="prompt"><span class="key">E</span> {active.label}{#if active.sub} · <small>{active.sub}</small>{/if}</div>
  {/if}

  {#if toast}<div class="toast">{toast}</div>{/if}

  <div class="hint"><b>W/S</b> avanzar · <b>A/D</b> girar · arrastra para mirar</div>
  <div class="badge">PROENZA · despacho virtual</div>

  <!-- controles táctiles -->
  <div class="mctrl">
    <button aria-label="Girar izquierda" onpointerdown={() => hold('a', true)} onpointerup={() => hold('a', false)} onpointerleave={() => hold('a', false)} oncontextmenu={(e) => e.preventDefault()}>◀</button>
    <div class="mcol">
      <button aria-label="Avanzar" onpointerdown={() => hold('w', true)} onpointerup={() => hold('w', false)} onpointerleave={() => hold('w', false)}>▲</button>
      <button aria-label="Retroceder" onpointerdown={() => hold('s', true)} onpointerup={() => hold('s', false)} onpointerleave={() => hold('s', false)}>▼</button>
    </div>
    <button aria-label="Girar derecha" onpointerdown={() => hold('d', true)} onpointerup={() => hold('d', false)} onpointerleave={() => hold('d', false)}>▶</button>
  </div>

  {#if !ready && !failed}<div class="loader">Entrando al despacho…</div>{/if}

  <!-- PANEL de interacción -->
  {#if open}
    <div class="overlay">
      <button class="scrim" aria-label="Cerrar" onclick={closeStation}></button>
      <div class="sheet">
        <div class="sheet-head">
          <h3>{open.type === 'office' ? `Agenda con ${open.lawyer.name}` : open.type === 'reception' ? 'Deja tu caso' : 'Biblioteca'}</h3>
          <button class="x" onclick={closeStation}>✕</button>
        </div>
        <div class="sheet-body">
          {#if open.type === 'office'}
            <div class="law"><span class="mono">{initials(open.lawyer.name)}</span><div><b>{open.lawyer.name}</b><small>{open.lawyer.role}</small></div></div>
            <p>{open.lawyer.bio}</p>
            <form class="form" onsubmit={(e) => citaWhats(e, open.lawyer)}>
              <div class="row"><label>Nombre<input bind:value={f.nombre} required /></label><label>Contacto<input bind:value={f.contacto} required placeholder="WhatsApp / correo" /></label></div>
              <div class="row"><label>Fecha preferida<input type="date" bind:value={f.fecha} /></label><label>Detalle<input bind:value={f.mensaje} placeholder="opcional" /></label></div>
              <button class="send" type="submit">Agendar por WhatsApp</button>
            </form>
          {:else if open.type === 'reception'}
            <p>Cuéntanos tu situación y nuestro equipo la analiza para orientarte.</p>
            <form class="form" onsubmit={casoWhats}>
              <div class="row"><label>Nombre<input bind:value={f.nombre} required /></label><label>Contacto<input bind:value={f.contacto} required placeholder="WhatsApp / correo" /></label></div>
              <label>Tu caso<textarea rows="4" bind:value={f.mensaje} required></textarea></label>
              <button class="send" type="submit">Enviar caso por WhatsApp</button>
            </form>
          {:else}
            {#if !selPost}
              <div class="grid">
                {#each posts as p}
                  <button class="card" onclick={() => (selPost = p)}><span class="tag">{p.area}</span><b>{p.title}</b><small>{formatDate(p.date)} · {p.readingMinutes} min</small></button>
                {/each}
              </div>
            {:else}
              {@const A = selPost.component}
              <button class="back" onclick={() => (selPost = null)}>← Biblioteca</button>
              <article class="prose"><h4>{selPost.title}</h4><A /></article>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .demo { position: fixed; inset: 0; overflow: hidden; background: #cdd6df; font-family: var(--ui-font, system-ui, sans-serif); }
  canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
  .nav { position: absolute; top: 16px; left: 16px; right: 16px; display: flex; justify-content: space-between; gap: 1rem; pointer-events: none; }
  .nav nav, .nav .contact span { background: rgba(255,255,255,0.14); backdrop-filter: blur(8px); color: #fff; font-size: 0.7rem; letter-spacing: 0.06em; padding: 0.55rem 0.9rem; border-radius: 8px; text-shadow: 0 1px 4px rgba(0,0,0,0.4); }
  .nav .contact { display: flex; gap: 0.6rem; }
  .nav .contact span { border-radius: 999px; }
  .explore { position: absolute; top: 50%; right: 4vw; transform: translateY(-50%); width: 270px; background: rgba(20,28,38,0.32); backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,0.28); border-radius: 16px; padding: 1.3rem; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.5); box-shadow: 0 18px 50px rgba(0,0,0,0.3); }
  .explore h2 { font-size: 1rem; margin: 0 0 0.8rem; }
  .explore .poi { font-size: 0.78rem; opacity: 0.85; margin: 0 0 0.4rem; }
  .explore ul { list-style: none; margin: 0 0 0.8rem; padding: 0; display: grid; gap: 0.3rem; font-size: 0.84rem; }
  .explore li.done { color: #9fe6c0; }
  .explore .next { font-size: 0.8rem; margin: 0 0 0.9rem; }
  .cta { display: block; width: 100%; text-align: center; padding: 0.7rem; border: 1px solid rgba(255,255,255,0.5); background: rgba(255,255,255,0.14); color: #fff; border-radius: 999px; font: inherit; font-size: 0.78rem; cursor: pointer; }
  .cta.ghost { opacity: 0.6; cursor: default; }
  .prompt { position: absolute; left: 50%; bottom: 12vh; transform: translateX(-50%); background: rgba(255,255,255,0.92); color: #14202e; padding: 0.55rem 1rem; border-radius: 999px; font-size: 0.9rem; box-shadow: 0 8px 24px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 0.5rem; }
  .prompt .key { background: #14202e; color: #fff; border-radius: 5px; padding: 0 6px; font-size: 0.72rem; font-weight: 700; }
  .toast { position: absolute; left: 50%; top: 12%; transform: translateX(-50%); background: rgba(20,28,38,0.9); color: #fff; padding: 0.7rem 1.1rem; border-radius: 12px; font-size: 0.9rem; }
  .hint { position: absolute; right: 16px; bottom: 14px; color: #fff; font-size: 0.64rem; letter-spacing: 0.08em; text-align: right; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
  .badge { position: absolute; left: 16px; bottom: 14px; color: rgba(255,255,255,0.85); font-size: 0.64rem; letter-spacing: 0.08em; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
  .mctrl { position: absolute; left: 16px; bottom: 40px; display: none; align-items: center; gap: 8px; z-index: 10; }
  .mctrl button { width: 50px; height: 50px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.3); background: rgba(20,28,38,0.5); backdrop-filter: blur(6px); color: #fff; font-size: 1.05rem; cursor: pointer; touch-action: none; user-select: none; display: grid; place-items: center; }
  .mctrl .mcol { display: grid; gap: 6px; }
  .mctrl .mcol button { height: 44px; }
  @media (pointer: coarse) { .mctrl { display: flex; } .badge { display: none; } }
  @media (max-width: 720px) { .mctrl { display: flex; } }
  .loader { position: absolute; inset: 0; display: grid; place-content: center; color: #33414f; }

  .overlay { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; z-index: 20; }
  .scrim { position: absolute; inset: 0; border: 0; background: rgba(8,14,28,0.5); backdrop-filter: blur(4px); cursor: pointer; }
  .sheet { position: relative; width: min(640px, 92vw); max-height: 86vh; background: #fffdf8; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 24px 70px rgba(0,0,0,0.4); }
  .sheet-head { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.3rem; border-bottom: 1px solid #e7e2d6; }
  .sheet-head h3 { margin: 0; font-family: Georgia, serif; font-size: 1.25rem; color: #14202e; }
  .x { width: 36px; height: 36px; border-radius: 50%; border: 1px solid #e7e2d6; background: #fff; cursor: pointer; }
  .sheet-body { padding: 1.3rem; overflow-y: auto; color: #14202e; }
  .law { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.6rem; }
  .mono { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; background: #1b4d89; color: #fff; font-weight: 700; }
  .law small { display: block; color: #45525f; }
  .form { display: grid; gap: 0.8rem; margin-top: 0.5rem; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
  label { display: grid; gap: 0.3rem; font-size: 0.84rem; font-weight: 600; }
  input, textarea { font: inherit; font-weight: 400; padding: 0.6rem 0.75rem; border: 1px solid #ddd; border-radius: 8px; }
  .send { padding: 0.8rem; border: 0; border-radius: 999px; background: linear-gradient(180deg, #ddb869, #c29a4b); color: #2a2008; font-weight: 700; cursor: pointer; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
  .card { text-align: left; border: 1px solid #e7e2d6; background: #fff; border-radius: 12px; padding: 1rem; cursor: pointer; display: grid; gap: 0.3rem; }
  .tag { font-size: 0.7rem; color: #1b4d89; text-transform: capitalize; }
  .back { background: none; border: 0; color: #1b4d89; font-weight: 600; cursor: pointer; padding: 0 0 0.6rem; }
  .prose :global(h2) { font-size: 1.1rem; margin-top: 1.2rem; }
  @media (max-width: 720px) {
    .explore { top: 60px; right: 8px; left: auto; bottom: auto; transform: none; width: 165px; padding: 0.8rem; max-height: 50vh; overflow: auto; }
    .explore h2 { font-size: 0.82rem; margin-bottom: 0.5rem; }
    .explore .poi { display: none; }
    .explore ul { font-size: 0.74rem; gap: 0.2rem; margin-bottom: 0.5rem; }
    .explore .next { font-size: 0.72rem; margin-bottom: 0.6rem; }
    .cta { padding: 0.55rem; font-size: 0.72rem; }
    .nav nav { display: none; }
    .nav { top: 12px; left: 12px; right: 12px; }
    .prompt { bottom: 17vh; font-size: 0.82rem; }
    .row { grid-template-columns: 1fr; }
    .grid { grid-template-columns: 1fr; }
  }
</style>
