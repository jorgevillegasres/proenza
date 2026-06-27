<script>
  import { onMount } from 'svelte'
  import { site, whatsappLink } from '$lib/data/site.js'
  import { abogados, initials } from '$lib/data/abogados.js'
  import { posts, formatDate } from '$lib/data/posts.js'
  import logoUrl from '$lib/assets/brand/logo.svg'
  import logoLightUrl from '$lib/assets/brand/logo-light.svg'
  import ambienteUrl from '$lib/assets/audio/ambiente.m4a'
  import monsteraUrl from '$lib/assets/demo/models/monstera.glb?url'
  import lampUrl from '$lib/assets/demo/models/lamp.glb?url'
  import laptopUrl from '$lib/assets/demo/models/laptop.glb?url'
  import artAbstractUrl from '$lib/assets/demo/art/art-abstract.webp'
  import artCourthouseUrl from '$lib/assets/demo/art/art-courthouse.webp'
  import artLandscapeUrl from '$lib/assets/demo/art/art-landscape.webp'
  import artLibraryUrl from '$lib/assets/demo/art/art-library.webp'
  import chairExecUrl from '$lib/assets/demo/models/chair_exec.glb?url'
  import chairLoungeUrl from '$lib/assets/demo/models/chair_lounge.glb?url'
  import bookshelfUrl from '$lib/assets/demo/models/bookshelf.glb?url'
  import sofaUrl from '$lib/assets/demo/models/sofa.glb?url'

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
  let camYaw = $state(0) // para la brújula
  let soundOn = $state(false)
  let audioEl = null
  // Pasos sintetizados con WebAudio (ráfaga de ruido filtrado).
  let footCtx = null
  function ensureFootAudio() {
    if (!footCtx) { try { footCtx = new (window.AudioContext || window.webkitAudioContext)() } catch { footCtx = null } }
    if (footCtx && footCtx.state === 'suspended') footCtx.resume()
  }
  function playFootstep() {
    if (!footCtx) return
    const t = footCtx.currentTime, len = Math.floor(footCtx.sampleRate * 0.09)
    const buf = footCtx.createBuffer(1, len, footCtx.sampleRate); const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    const src = footCtx.createBufferSource(); src.buffer = buf
    const flt = footCtx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 360
    const g = footCtx.createGain(); g.gain.setValueAtTime(0.15, t)
    src.connect(flt); flt.connect(g); g.connect(footCtx.destination); src.start(t)
  }
  function toggleSound() {
    if (!audioEl) { audioEl = new Audio(ambienteUrl); audioEl.loop = true; audioEl.volume = 0.3 }
    if (soundOn) { audioEl.pause(); soundOn = false }
    else audioEl.play().then(() => { soundOn = true; ensureFootAudio() }).catch(() => (soundOn = false))
  }

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
    { id: 'biblioteca', type: 'library', label: 'Biblioteca', sub: 'Artículos y blog', z: 9.4 },
  ]
  stationsUI = STATIONS.map((s) => ({ id: s.id, label: s.label, type: s.type }))

  function openStation(s) {
    open = s; sent = null; f = { nombre: '', contacto: '', fecha: '', mensaje: '' }
    if (s && !discovered.includes(s.id)) discovered = [...discovered, s.id]
  }
  function closeStation() { open = null; sent = null }
  function showToast(msg) { toast = msg; setTimeout(() => (toast = msg === toast ? '' : toast), 3500) }

  // formularios
  let f = $state({ nombre: '', contacto: '', fecha: '', mensaje: '' })
  let sent = $state(null) // null | 'whatsapp' | 'citaly'
  const citalyFor = (lawyer) => (lawyer && lawyer.citalyUrl) || site.citalyUrl || ''
  function agendarCitaly(lawyer) {
    const url = citalyFor(lawyer)
    if (url) globalThis.open(url, '_blank', 'noopener')
    sent = 'citaly'
  }
  function citaWhats(e, lawyer) {
    e?.preventDefault()
    if (!f.nombre.trim() || !f.contacto.trim()) return
    const msg = `Hola, quiero agendar una cita con ${lawyer.name} (${lawyer.role}).\n• Nombre: ${f.nombre}\n• Contacto: ${f.contacto}\n• Fecha: ${f.fecha || '—'}\n` + (f.mensaje ? `• Detalle: ${f.mensaje}\n` : '')
    globalThis.open(whatsappLink(msg), '_blank', 'noopener')
    sent = 'whatsapp'
  }
  function casoWhats(e) {
    e?.preventDefault()
    if (!f.nombre.trim() || !f.contacto.trim() || !f.mensaje.trim()) return
    const msg = `Hola, quiero dejar mi caso para análisis.\n• Nombre: ${f.nombre}\n• Contacto: ${f.contacto}\n• Caso: ${f.mensaje}\n`
    globalThis.open(whatsappLink(msg), '_blank', 'noopener')
    sent = 'whatsapp'
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
      let RoundedBoxGeometry = null
      try { ({ RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js')) } catch { RoundedBoxGeometry = null }
      let Reflector = null
      try { ({ Reflector } = await import('three/examples/jsm/objects/Reflector.js')) } catch { Reflector = null }
      const lowEnd = matchMedia('(pointer: coarse)').matches || innerWidth < 820
      // Modelos 3D foto-reales (Higgsfield) — carga diferida con meshopt.
      let GLB = { monstera: null, lamp: null, laptop: null, chairExec: null, chairLounge: null, bookshelf: null, sofa: null }
      try {
        const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
          import('three/examples/jsm/loaders/GLTFLoader.js'),
          import('three/examples/jsm/libs/meshopt_decoder.module.js'),
        ])
        const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder)
        const load = (url) => new Promise((res) => loader.load(url, (g) => res(g.scene), undefined, () => res(null)))
        const [mo, la, lp, ce, cl, bs, so] = await Promise.all([load(monsteraUrl), load(lampUrl), load(laptopUrl), load(chairExecUrl), load(chairLoungeUrl), load(bookshelfUrl), load(sofaUrl)])
        if (cancelled) return
        GLB = { monstera: mo, lamp: la, laptop: lp, chairExec: ce, chairLounge: cl, bookshelf: bs, sofa: so }
      } catch { /* sin modelos GLB */ }

      let renderer
      try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); if (!renderer.getContext()) throw 0 } catch { failed = true; return }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)) // tope 1.5 → más fluidez en pantallas HiDPI
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 0.9

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xe6e8e9)
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

      // Materiales PBR (premium): roughness/metalness reales + reflejos del entorno.
      const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, envMapIntensity: 1.0, ...o })
      const M = {
        floor: mat(0xc9c2b4, { roughness: 0.13, metalness: 0.0, envMapIntensity: 1.7 }), // concreto/madera pulida reflectante
        wall: mat(0xeae6dd, { roughness: 0.95 }),
        ceil: mat(0xf2efe8, { roughness: 1 }),
        wood: mat(0x6b4a32, { roughness: 0.4, metalness: 0.05, envMapIntensity: 1.0 }),  // madera cálida realista
        deskTop: mat(0x4a3322, { roughness: 0.3, envMapIntensity: 1.1 }),
        glass: new THREE.MeshStandardMaterial({ color: 0xeaf2f5, roughness: 0.04, metalness: 0.0, transparent: true, opacity: 0.16, envMapIntensity: 1.9 }),
        frosted: new THREE.MeshStandardMaterial({ color: 0xdde7eb, roughness: 0.92, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), // vidrio esmerilado
        frame: mat(0x2a2f36, { roughness: 0.4, metalness: 0.8, envMapIntensity: 1.4 }),
        dark: mat(0x1b1f24, { roughness: 0.5, metalness: 0.2 }),
        line: new THREE.MeshStandardMaterial({ color: 0xeaf6ff, emissive: 0x9fd4ff, emissiveIntensity: 2.2 }),
        lamp: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d8, emissiveIntensity: 3 }),
      }

      // --- texturas procedurales (rompen el color plano) ---------------------
      const mkTex = (draw, rep = 1) => {
        const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); draw(g, 512)
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; return t
      }
      const marbleTex = (base, vein) => mkTex((g, s) => {
        g.fillStyle = base; g.fillRect(0, 0, s, s)
        g.strokeStyle = vein; g.lineWidth = 1; g.globalAlpha = 0.12
        for (let i = 0; i < 26; i++) { g.beginPath(); let x = Math.random() * s, y = Math.random() * s; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * s * 0.5; y += (Math.random() - 0.5) * s * 0.5; g.lineTo(x, y) } g.stroke() }
      })
      const woodTex = (base, dark) => mkTex((g, s) => {
        g.fillStyle = base; g.fillRect(0, 0, s, s); g.globalAlpha = 0.18; g.strokeStyle = dark
        for (let x = 0; x < s; x += 3) { g.lineWidth = 0.5 + Math.random() * 1.6; g.beginPath(); g.moveTo(x + (Math.random() - 0.5) * 4, 0); g.bezierCurveTo(x + 8, s * 0.33, x - 8, s * 0.66, x + (Math.random() - 0.5) * 4, s); g.stroke() }
      })
      M.floor.map = marbleTex('#c9c2b4', '#ada592'); M.floor.map.repeat.set(5, 5) // concreto pulido sutil
      M.wood.map = woodTex('#6b4a32', '#3f2a18'); M.wood.map.repeat.set(2, 2)
      M.deskTop.map = woodTex('#4a3322', '#2a1c12'); M.deskTop.map.repeat.set(2, 2)

      const HALL_Z0 = -9.2, HALL_Z1 = 11, H = 3.3, X_L = -2.2, X_R = 2.2, X_LBACK = -7.5
      const grp = new THREE.Group(); scene.add(grp)
      const addM = (m, cast = true, rec = true) => { m.castShadow = cast; m.receiveShadow = rec; grp.add(m); return m }
      // Caja con aristas redondeadas (radio adaptativo) — evita el look "cuadriculado".
      const geom = (w, h, d, soft = 1) => {
        if (RoundedBoxGeometry) {
          const r = Math.max(0.006, Math.min(0.035 * soft, w / 2, h / 2, d / 2) * 0.85)
          return new RoundedBoxGeometry(w, h, d, 2, r)
        }
        return new THREE.BoxGeometry(w, h, d)
      }
      const box = (w, h, d, material, x, y, z, ry = 0) => { const m = new THREE.Mesh(geom(w, h, d), material); m.position.set(x, y, z); m.rotation.y = ry; return addM(m) }
      // Coloca un modelo GLB: escala a una altura objetivo, lo apoya en baseY y lo orienta.
      const placeModel = (src, x, z, targetH, baseY = 0, ry = 0) => {
        if (!src) return null
        const obj = src.clone(true); obj.rotation.y = ry
        let bb = new THREE.Box3().setFromObject(obj); const size = new THREE.Vector3(); bb.getSize(size)
        obj.scale.setScalar(targetH / (size.y || 1))
        bb = new THREE.Box3().setFromObject(obj); const c = new THREE.Vector3(); bb.getCenter(c)
        obj.position.set(x - c.x, baseY - bb.min.y, z - c.z)
        obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.envMapIntensity = 0.9 } })
        grp.add(obj); return obj
      }
      const planeM = (w, h, material, x, y, z, rx = 0, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); return addM(m, false, true) }
      const cyl = (rt, rb, h, material, x, y, z, seg = 18) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material); m.position.set(x, y, z); return addM(m) }
      // Silla de oficina (asiento + respaldo redondeados, poste y base de patas).
      const officeChair = (x, z, ry) => {
        const g = new THREE.Group(); const sm = mat(0x1b1e22, { roughness: 0.55 })
        g.add(new THREE.Mesh(geom(0.52, 0.12, 0.52, 1.5), sm).translateY(0.5))
        const back = new THREE.Mesh(geom(0.5, 0.64, 0.12, 1.5), sm); back.position.set(0, 0.86, -0.22); g.add(back)
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 12), M.frame).translateY(0.27))
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.05, 5), M.frame).translateY(0.05))
        g.position.set(x, 0, z); g.rotation.y = ry
        g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
        grp.add(g); return g
      }
      // Sillón (cojín, respaldo reclinado, brazos, patas). Mira hacia +z local.
      const armchair = (x, z, ry, color = 0x394049) => {
        const g = new THREE.Group(); const m = mat(color, { roughness: 0.78, envMapIntensity: 0.8 })
        g.add(new THREE.Mesh(geom(0.82, 0.22, 0.78, 1.6), m).translateY(0.34))           // cojín de asiento
        const back = new THREE.Mesh(geom(0.82, 0.62, 0.18, 1.6), m); back.position.set(0, 0.64, -0.32); back.rotation.x = -0.09; g.add(back)
        g.add(new THREE.Mesh(geom(0.16, 0.36, 0.74, 1.6), m).translateY(0.43).translateX(-0.35)) // brazo izq
        g.add(new THREE.Mesh(geom(0.16, 0.36, 0.74, 1.6), m).translateY(0.43).translateX(0.35))  // brazo der
        for (const sx of [-0.33, 0.33]) for (const sz of [-0.32, 0.32]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.22, 8), M.frame).translateY(0.11).translateX(sx).translateZ(sz))
        g.position.set(x, 0, z); g.rotation.y = ry
        g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
        grp.add(g); return g
      }
      // Planta en maceta (follaje con varios blobs suaves).
      const plant = (x, z, s = 1) => {
        const g = new THREE.Group()
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.19 * s, 0.16 * s, 0.4 * s, 24), mat(0x2c2f33, { roughness: 0.5, metalness: 0.1 })); pot.position.y = 0.2 * s; g.add(pot) // maceta moderna mate
        const leaf = mat(0x2f6e3a, { roughness: 0.6 })
        const blobs = [[0, 0.62, 0, 0.36], [0.2, 0.78, 0.05, 0.27], [-0.17, 0.8, -0.06, 0.25], [0.05, 0.98, 0.02, 0.23], [-0.06, 0.7, 0.19, 0.22], [0.16, 0.62, -0.16, 0.2]]
        for (const [bx, by, bz, br] of blobs) { const mm = new THREE.Mesh(new THREE.SphereGeometry(br * s, 20, 16), leaf); mm.position.set(bx * s, by * s, bz * s); mm.scale.set(1, 1.25, 1); g.add(mm) }
        g.position.set(x, 0, z)
        g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
        grp.add(g); return g
      }

      const totalZ = HALL_Z1 - HALL_Z0
      const midZ = (HALL_Z0 + HALL_Z1) / 2
      // piso reflectante (Reflector) + capa de pulido translúcida; techo
      const FW = X_R - X_LBACK + 4, FX = (X_R + X_LBACK) / 2
      let reflector = null
      if (!lowEnd && Reflector) {
        try {
          reflector = new Reflector(new THREE.PlaneGeometry(FW, totalZ), { textureWidth: 512, textureHeight: 512, color: 0x6a6f76, clipBias: 0.004 })
          reflector.position.set(FX, 0, midZ); reflector.rotation.x = -Math.PI / 2; grp.add(reflector)
          M.floor.transparent = true; M.floor.opacity = 0.66 // deja ver el reflejo difuminado
          planeM(FW, totalZ, M.floor, FX, 0.004, midZ, -Math.PI / 2) // pulido encima
        } catch { reflector = null }
      }
      if (!reflector) planeM(FW, totalZ, M.floor, FX, 0, midZ, -Math.PI / 2)
      planeM(FW, totalZ, M.ceil, FX, H, midZ, Math.PI / 2)
      // pared de entrada (frente) y back-left
      planeM(X_R - X_LBACK, H, M.wall, (X_R + X_LBACK) / 2, H / 2, HALL_Z1, 0, Math.PI)
      planeM(X_R - X_LBACK, H, M.wall, (X_R + X_LBACK) / 2, H / 2, HALL_Z0 + 0.01, 0, 0)
      planeM(totalZ, H, M.wall, X_LBACK, H / 2, midZ, 0, Math.PI / 2) // pared izquierda exterior
      // zócalos
      box(0.05, 0.12, totalZ, M.dark, X_LBACK + 0.03, 0.06, midZ)
      box(X_R - X_LBACK, 0.12, 0.05, M.dark, (X_R + X_LBACK) / 2, 0.06, HALL_Z0 + 0.05)
      box(X_R - X_LBACK, 0.12, 0.05, M.dark, (X_R + X_LBACK) / 2, 0.06, HALL_Z1 - 0.05)

      // --- ventanal derecho con la ciudad (vista real; skyline ilustrado de respaldo)
      const cityMat = new THREE.MeshBasicMaterial({ color: 0xbcd3e6 })
      if (cityUrl) {
        const t = new THREE.TextureLoader().load(cityUrl); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.MirroredRepeatWrapping; t.repeat.x = 1.5; t.anisotropy = 8; cityMat.map = t
      } else {
        const skyTex = mkTex((g, s) => {
          const grad = g.createLinearGradient(0, 0, 0, s)
          grad.addColorStop(0, '#bcd8ea'); grad.addColorStop(0.5, '#e6eef0'); grad.addColorStop(1, '#f7e9d6')
          g.fillStyle = grad; g.fillRect(0, 0, s, s)
          const layer = (alpha, color, baseY, minH, maxH, minW, maxW, gap) => {
            g.fillStyle = color; g.globalAlpha = alpha; let x = -10
            while (x < s + 10) { const w = minW + Math.random() * (maxW - minW), h = minH + Math.random() * (maxH - minH); g.fillRect(x, baseY - h, w, h); x += w + gap }
          }
          layer(0.35, '#9fb2c4', s * 0.92, 30, 120, 16, 40, 8); layer(0.55, '#7d93a9', s * 1.0, 50, 170, 24, 56, 10); g.globalAlpha = 1
        })
        skyTex.repeat.set(3, 1); cityMat.map = skyTex
      }
      planeM(totalZ * 2.4, H * 1.7, cityMat, X_R + 3, H / 2 + 0.2, midZ, 0, -Math.PI / 2)
      planeM(totalZ, H, M.glass, X_R - 0.02, H / 2, midZ, 0, -Math.PI / 2)
      const mullion = mat(0x9aa0a6, { metalness: 0.55, roughness: 0.45, envMapIntensity: 1.2 }) // aluminio claro
      for (let z = HALL_Z0; z <= HALL_Z1; z += 2.8) box(0.05, H, 0.05, mullion, X_R - 0.03, H / 2, z)
      planeM(totalZ, 0.1, mullion, X_R - 0.03, 0.06, midZ, -Math.PI / 2)
      planeM(totalZ, 0.1, mullion, X_R - 0.03, H - 0.06, midZ, -Math.PI / 2)

      // --- luces de techo ----------------------------------------------------
      for (let z = HALL_Z0 + 2; z < HALL_Z1; z += 3.2) {
        box(0.25, 0.05, 1.6, M.lamp, 0, H - 0.04, z)
        const pl = new THREE.PointLight(0xfff2de, 6, 12, 2); pl.position.set(0, H - 0.4, z); grp.add(pl)
      }
      // cove perimetral del techo (brillo suave que florece con el bloom)
      const cove = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe6c0, emissiveIntensity: 1.7 })
      box(0.08, 0.05, totalZ, cove, X_LBACK + 0.16, H - 0.13, midZ)
      box(0.08, 0.05, totalZ, cove, X_R - 0.16, H - 0.13, midZ)
      box(X_R - X_LBACK, 0.05, 0.08, cove, (X_R + X_LBACK) / 2, H - 0.13, HALL_Z0 + 0.22)
      box(X_R - X_LBACK, 0.05, 0.08, cove, (X_R + X_LBACK) / 2, H - 0.13, HALL_Z1 - 0.22)
      const day = new THREE.DirectionalLight(0xffe6c0, 1.5); day.position.set(16, 13, 9); day.castShadow = true // sol cálido de tarde
      day.shadow.mapSize.set(1024, 1024); day.shadow.camera.near = 1; day.shadow.camera.far = 80
      Object.assign(day.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14 }); day.shadow.bias = -0.0005; day.shadow.radius = 6
      grp.add(day, day.target)
      // relleno cálido cielo/suelo (la GTAO aporta la profundidad)
      grp.add(new THREE.HemisphereLight(0xffeede, 0xbfa988, 0.38))
      grp.add(new THREE.AmbientLight(0xfff3e3, 0.08))
      // luz dorada de borde desde el ventanal (sin sombra)
      const golden = new THREE.DirectionalLight(0xffca7a, 0.35); golden.position.set(20, 5, -2); grp.add(golden, golden.target)

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
      // Vinilo esmerilado: banda de cristal con el nombre grabado (señalética integrada).
      const etchedSign = (line1, line2, w, h) => {
        const c = document.createElement('canvas'); c.width = 2048; c.height = 320; const g = c.getContext('2d')
        g.fillStyle = 'rgba(222,231,235,0.72)'; g.fillRect(0, 0, 2048, 320)
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(0, 0, 2048, 7); g.fillRect(0, 313, 2048, 7)
        g.textAlign = 'left'; g.textBaseline = 'middle'
        g.fillStyle = '#1d2733'; g.font = '700 118px Georgia, serif'; g.fillText(line1, 80, line2 ? 130 : 160)
        if (line2) { g.fillStyle = '#586572'; g.font = '400 58px Arial, sans-serif'; g.fillText(line2, 84, 235) }
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
        return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.85, side: THREE.DoubleSide }))
      }
      // Cuadro de pared: plano texturizado con la obra enmarcada (la imagen ya trae marco).
      const _artTex = {}
      const wallArt = (url, w, h, x, y, z, ry) => {
        let tex = _artTex[url]
        if (!tex) { tex = new THREE.TextureLoader().load(url); tex.colorSpace = THREE.SRGBColorSpace; _artTex[url] = tex }
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 }))
        m.position.set(x, y, z); m.rotation.y = ry; return addM(m, false, true)
      }
      // Letrero a partir de una imagen (el logo) — retroiluminado.
      const imgSign = (url, w, h) => {
        const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round((1024 * h) / w)
        const ctx = c.getContext('2d')
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
        const img = new Image()
        img.onload = () => { ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height); tex.needsUpdate = true }
        img.src = url
        return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xfff0d8, emissiveMap: tex, emissiveIntensity: 1.25, transparent: true }))
      }

      // --- recepción (fondo) -------------------------------------------------
      planeM(X_R - X_LBACK, H, M.wood, (X_R + X_LBACK) / 2 + 1.5, H / 2, HALL_Z0 + 0.02, 0, 0) // muro de madera
      { const sign = imgSign(logoLightUrl, 3.7, 1.0); sign.position.set(-1.2, 2.0, HALL_Z0 + 0.06); grp.add(sign) }
      wallArt(artLibraryUrl, 0.64, 0.8, 2.4, 1.6, HALL_Z0 + 0.07, 0)      // cuadros flanqueando el logo
      wallArt(artLandscapeUrl, 0.64, 0.8, -4.5, 1.6, HALL_Z0 + 0.07, 0)
      { // mostrador de mármol
        const counter = new THREE.Mesh(geom(3.4, 1.05, 0.9), mat(0xd9dde2, { roughness: 0.18, envMapIntensity: 1.3 }))
        counter.position.set(-1.2, 0.525, HALL_Z0 + 1.5); counter.castShadow = counter.receiveShadow = true; grp.add(counter)
        box(3.6, 0.08, 1.05, M.deskTop, -1.2, 1.08, HALL_Z0 + 1.5)
      }
      // sofá de espera junto al ventanal de la recepción
      placeModel(GLB.sofa, X_R - 0.95, HALL_Z0 + 3.2, 0.78, 0, -Math.PI / 2)

      // --- oficinas (lado izquierdo) -----------------------------------------
      const proxPoints = []
      const artUrls = [artAbstractUrl, artCourthouseUrl, artLandscapeUrl, artLibraryUrl]
      let artIdx = 0
      for (const s of STATIONS.filter((x) => x.type === 'office')) {
        const zc = s.z, hd = 1.55
        // particiones laterales de vidrio esmerilado (premium, abre el pasillo)
        for (const dz of [-hd, hd]) {
          box(X_L - X_LBACK, 0.5, 0.06, M.dark, (X_L + X_LBACK) / 2, 0.25, zc + dz)                            // base opaca
          planeM(X_L - X_LBACK, H - 0.55, M.frosted, (X_L + X_LBACK) / 2, 0.5 + (H - 0.55) / 2, zc + dz, 0, 0)  // cristal esmerilado
          box(X_L - X_LBACK, 0.06, 0.06, M.frame, (X_L + X_LBACK) / 2, H - 0.03, zc + dz)                       // riel superior
        }
        planeM(2 * hd, H, M.glass, X_L, H / 2, zc, 0, Math.PI / 2) // frente de vidrio claro al pasillo
        box(0.06, H, 0.06, M.frame, X_L, H / 2, zc - hd)
        box(0.06, H, 0.06, M.frame, X_L, H / 2, zc + hd)
        // escritorio + silla dentro
        const desk = box(1.6, 0.9, 0.75, M.wood, X_L - 2.2, 0.45, zc, Math.PI / 2)
        box(1.75, 0.06, 0.9, M.deskTop, X_L - 2.2, 0.92, zc, Math.PI / 2)
        if (!placeModel(GLB.chairExec, X_L - 3.0, zc, 1.18, 0, Math.PI / 2)) officeChair(X_L - 3.0, zc, Math.PI / 2)
        // portátil + lámpara de diseño sobre el escritorio; Monstera en la esquina
        if (!placeModel(GLB.laptop, X_L - 2.2, zc, 0.21, 0.95, Math.PI / 2)) { box(0.5, 0.3, 0.04, M.dark, X_L - 2.4, 1.18, zc, Math.PI / 2); box(0.14, 0.16, 0.1, M.dark, X_L - 2.3, 1.0, zc) }
        placeModel(GLB.lamp, X_L - 2.7, zc + 0.6, 0.5, 0.95, -0.6)
        if (!placeModel(GLB.monstera, X_LBACK + 0.75, zc + 1.05, 1.1, 0, 0.6)) plant(X_LBACK + 0.55, zc + 1.05, 0.92)
        wallArt(artUrls[artIdx++ % artUrls.length], 0.62, 0.78, X_LBACK + 0.05, 1.7, zc - 0.7, Math.PI / 2)
        // nombre en vinilo esmerilado sobre el cristal del frente (señalética integrada)
        const band = etchedSign(s.label, s.sub, 2.5, 0.62)
        band.position.set(X_L + 0.03, 1.5, zc); band.rotation.y = Math.PI / 2; grp.add(band)
        proxPoints.push({ s, x: X_L + 0.9, z: zc })
      }

      // --- biblioteca (sala a la izquierda, junto a la entrada) --------------
      {
        const zc = 9.4, hd = 1.3
        box(X_L - X_LBACK, H, 0.08, M.wall, (X_L + X_LBACK) / 2, H / 2, zc - hd)
        box(X_L - X_LBACK, H, 0.08, M.wall, (X_L + X_LBACK) / 2, H / 2, zc + hd)
        planeM(2 * hd, H, M.glass, X_L, H / 2, zc, 0, Math.PI / 2)
        box(0.06, H, 0.06, M.frame, X_L, H / 2, zc - hd)
        box(0.06, H, 0.06, M.frame, X_L, H / 2, zc + hd)
        // librería 3D contra la pared del fondo (fallback: estanterías procedurales)
        if (!placeModel(GLB.bookshelf, X_LBACK + 0.42, zc, 2.25, 0, Math.PI / 2)) {
          const cols = [0x6b4a2b, 0x355c7d, 0x99403a, 0x3f6f4f, 0x7a5aa0, 0x9c6b2e]
          for (const zz of [zc - 0.72, zc + 0.72]) {
            box(0.5, 2.5, 1.3, M.wood, X_LBACK + 0.3, 1.25, zz)
            for (let i = 0; i < 5; i++) box(0.42, 0.07, 1.2, M.deskTop, X_LBACK + 0.3, 0.5 + i * 0.5, zz)
            for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) box(0.16, 0.38, 0.13, mat(cols[(i + j) % cols.length]), X_LBACK + 0.5, 0.72 + i * 0.5, zz - 0.5 + j * 0.26)
          }
        }
        // alfombra + mesa de lectura central + dos sillones enfrentados
        box(2.4, 0.03, 2.0, mat(0x6f3b34, { roughness: 0.95 }), X_LBACK + 2.7, 0.015, zc)
        box(1.3, 0.45, 0.8, M.wood, X_LBACK + 2.7, 0.42, zc)
        box(1.4, 0.05, 0.9, M.deskTop, X_LBACK + 2.7, 0.66, zc)
        for (const dz of [-1.0, 1.0]) { if (!placeModel(GLB.chairLounge, X_LBACK + 2.7, zc + dz, 0.84, 0, dz < 0 ? 0 : Math.PI)) armchair(X_LBACK + 2.7, zc + dz, dz < 0 ? 0 : Math.PI, 0x3a414b) }
        // lámpara de pie en la esquina (poste cilíndrico + pantalla)
        cyl(0.025, 0.032, 1.5, M.frame, X_LBACK + 0.7, 0.75, zc + hd - 0.3, 12)
        cyl(0.13, 0.16, 0.06, M.frame, X_LBACK + 0.7, 0.04, zc + hd - 0.3, 18) // base
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.3, 24, 1, true), M.lamp); shade.position.set(X_LBACK + 0.7, 1.62, zc + hd - 0.3); addM(shade)
        // nombre en vinilo esmerilado sobre el cristal
        const band = etchedSign('Biblioteca', 'Blog jurídico', 2.4, 0.6)
        band.position.set(X_L + 0.03, 1.5, zc); band.rotation.y = Math.PI / 2; grp.add(band)
        proxPoints.push({ s: STATIONS.find((x) => x.id === 'biblioteca'), x: X_L + 0.9, z: zc })
      }

      // --- sala de espera junto al ventanal (derecha, entrada) ---------------
      {
        const zc = 8.8
        box(2.2, 0.03, 1.8, mat(0x4a4640, { roughness: 0.95 }), X_R - 1.2, 0.015, zc) // alfombra
        for (const dz of [-0.78, 0.78]) { if (!placeModel(GLB.chairLounge, X_R - 1.0, zc + dz, 0.84, 0, dz < 0 ? 0 : Math.PI)) armchair(X_R - 1.0, zc + dz, dz < 0 ? 0 : Math.PI, 0x2c3138) } // enfrentados, junto al ventanal
        box(0.6, 0.4, 0.6, M.wood, X_R - 1.0, 0.2, zc)             // mesa de centro
        if (!placeModel(GLB.monstera, X_R - 1.7, zc - 1.5, 1.35, 0, 0.3)) plant(X_R - 1.7, zc - 1.5, 1.2)
      }

      // --- rincón de café (izquierda, junto a la recepción) ------------------
      {
        const zc = -6.2
        box(1.0, 0.9, 0.5, M.wood, X_LBACK + 0.5, 0.45, zc)
        box(1.05, 0.05, 0.55, M.deskTop, X_LBACK + 0.5, 0.92, zc)
        box(0.2, 0.3, 0.2, M.dark, X_LBACK + 0.5, 1.1, zc + 0.15) // máquina de café
        if (!placeModel(GLB.monstera, X_LBACK + 0.5, zc - 1.2, 1.2, 0, -0.4)) plant(X_LBACK + 0.5, zc - 1.2, 1.05)
      }
      // recepción punto de proximidad
      proxPoints.push({ s: STATIONS.find((x) => x.id === 'recepcion'), x: -1.2, z: HALL_Z0 + 3.0 })

      // puntos de enfoque para la transición de cámara al entrar a una zona
      const V = (x, y, z) => new THREE.Vector3(x, y, z)
      const focusMap = {}
      for (const a of STATIONS.filter((x) => x.type === 'office')) focusMap[a.id] = { eye: V(X_L + 1.0, 1.6, a.z), look: V(X_L - 2.6, 1.35, a.z) }
      focusMap.recepcion = { eye: V(-1.2, 1.6, HALL_Z0 + 3.8), look: V(-1.2, 1.85, HALL_Z0 + 0.2) }
      focusMap.biblioteca = { eye: V(X_L + 1.0, 1.6, 9.4), look: V(X_LBACK + 1.5, 1.4, 9.4) }
      const _dummy = new THREE.Object3D()
      let wasOpen = false

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
      // 3) Campana de recepción en latón (detalle elegante, antes era el pato)
      const egg3 = new THREE.Group()
      const brass = mat(0xc69a3a, { metalness: 0.85, roughness: 0.28, envMapIntensity: 1.4 })
      egg3.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), brass))
      egg3.add(new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, 0.025, 24), brass))
      egg3.add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), brass).translateY(0.108))
      egg3.position.set(-0.2, 1.14, HALL_Z0 + 1.5); egg3.userData.egg = '🔔 Campana de recepción. En Proenza basta con escribirnos — sin filas, sin timbres.'; grp.add(egg3)
      // 4º: un libro escondido en la mesa de la biblioteca
      const egg4 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.16), mat(0x8a1f2b))
      egg4.position.set(X_LBACK + 2.7, 0.71, 9.4); egg4.userData.egg = '📖 "Código Civil anotado" — con un billete de lotería de marcapáginas. 🍀'; grp.add(egg4)
      const eggs = [egg1, egg2, egg3, egg4]

      // --- primera persona ---------------------------------------------------
      const eye = 1.62
      const cpos = new THREE.Vector3(0, eye, HALL_Z1 - 1.5)
      let yaw = 0, pitch = -0.03
      let introT = 0; const INTRO_DUR = 4.0 // animación cinematográfica de entrada
      const skipIntro = () => { if (introT < INTRO_DUR) introT = INTRO_DUR }
      const onKD = (e) => { const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', ' '].includes(k)) e.preventDefault(); if (k === 'escape') { closeStation(); return } if (open) return; ensureFootAudio(); skipIntro(); if (k === 'e' && active) { openStation(STATIONS.find((x) => x.id === active.id)); return } keys.add(k) }
      const onKU = (e) => keys.delete(e.key.toLowerCase())
      addEventListener('keydown', onKD); addEventListener('keyup', onKU)
      let dragging = false, lx = 0, ly = 0
      const down = (x, y) => { if (open) return; skipIntro(); dragging = true; lx = x; ly = y }
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
        // render target multisampleado → antialiasing MSAA (elimina el dentado "N64")
        const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { samples: 2 })
        composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera))
        // oclusión ambiental GTAO → profundidad y sombras de contacto (lo más impactante)
        if (!lowEnd) {
          try {
            const { GTAOPass } = await import('three/examples/jsm/postprocessing/GTAOPass.js')
            const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight)
            try { gtao.updateGtaoMaterial({ radius: 0.4, scale: 1.0, samples: 8 }) } catch { /* defaults */ }
            composer.addPass(gtao)
          } catch { /* sin GTAO */ }
        }
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.28, 0.6, 0.85)); composer.addPass(new OutputPass())
      } catch { composer = null }
      addEventListener('resize', resize); resize()

      const clock = new THREE.Clock(); let raf = 0
      const fwd = new THREE.Vector3(), rgt = new THREE.Vector3(), tv = new THREE.Vector3()
      let stepTimer = 0
      function frame() {
        raf = requestAnimationFrame(frame)
        const rawDt = clock.getDelta()
        const dt = Math.min(rawDt, 0.05)
        // --- intro cinematográfica: dolly suave hacia el punto de spawn ---
        if (introT < INTRO_DUR && !open) {
          introT += rawDt
          const t = Math.min(1, introT / INTRO_DUR), e = 1 - Math.pow(1 - t, 3)
          camera.rotation.order = 'YXZ'
          camera.rotation.set(-0.24 * (1 - e) + pitch * e, 0.18 * (1 - e), 0)
          camera.position.set(0.5 * (1 - e), 2.5 + (eye - 2.5) * e, (HALL_Z1 + 1.4) + ((HALL_Z1 - 1.5) - (HALL_Z1 + 1.4)) * e)
          if (composer) composer.render(); else renderer.render(scene, camera)
          if (!ready) ready = true
          return
        }
        if (!open) {
          if (wasOpen) {
            // al cerrar, retoma desde donde quedó la cámara (sin salto)
            cpos.copy(camera.position); cpos.y = eye
            const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
            yaw = e.y; pitch = Math.max(-1.0, Math.min(0.85, e.x)); wasOpen = false
          }
          // A/D giran la cámara; W/S avanzan/retroceden (intuitivo para un pasillo).
          let turn = 0, mz = 0
          if (keys.has('w') || keys.has('arrowup')) mz += 1
          if (keys.has('s') || keys.has('arrowdown')) mz -= 1
          if (keys.has('a') || keys.has('arrowleft')) turn += 1
          if (keys.has('d') || keys.has('arrowright')) turn -= 1
          yaw += turn * 2.3 * dt
          camera.rotation.order = 'YXZ'; camera.rotation.y = yaw; camera.rotation.x = pitch
          fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw))
          if (mz !== 0) {
            cpos.addScaledVector(fwd, mz * 4.4 * dt)
            cpos.x = Math.max(X_L + 0.5, Math.min(X_R - 0.5, cpos.x))
            cpos.z = Math.max(HALL_Z0 + 1.2, Math.min(HALL_Z1 - 0.6, cpos.z))
            stepTimer += dt
            if (soundOn && stepTimer >= 0.45) { stepTimer = 0; playFootstep() }
          } else stepTimer = 0.4
          cpos.y = eye; camera.position.copy(cpos)
          camYaw = yaw
          // proximidad
          let best = null, bd = 2.6
          for (const p of proxPoints) { const d = Math.hypot(cpos.x - p.x, cpos.z - p.z); if (d < bd) { bd = d; best = p.s } }
          const cur = best ? { id: best.id, label: best.label, sub: best.sub, type: best.type } : null
          if ((cur?.id || null) !== (active?.id || null)) active = cur
        } else {
          // transición cinematográfica al entrar a una zona
          wasOpen = true
          const fm = focusMap[open.id]
          if (fm) {
            _dummy.position.copy(camera.position); _dummy.up.set(0, 1, 0); _dummy.lookAt(fm.look)
            camera.quaternion.slerp(_dummy.quaternion, 1 - Math.pow(0.08, dt))
            camera.position.lerp(fm.eye, 1 - Math.pow(0.06, dt))
          }
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
    <div class="brand"><img src={logoUrl} alt="Proenza Abogados" /></div>
    <div class="contact">
      <span>{site.phone}</span>
      <span>{site.email}</span>
      <div class="social">
        <a href={site.social.instagram} target="_blank" rel="noopener" aria-label="Instagram">IG</a>
        <a href={site.social.facebook} target="_blank" rel="noopener" aria-label="Facebook">FB</a>
        <a href={site.social.x} target="_blank" rel="noopener" aria-label="X">X</a>
        <a href={site.social.youtube} target="_blank" rel="noopener" aria-label="YouTube">YT</a>
      </div>
    </div>
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

  <!-- brújula -->
  <div class="compass"><div class="dial" style={`transform: rotate(${-camYaw}rad)`}><span class="n">N</span><div class="needle"></div></div></div>
  <!-- sonido -->
  <button class="sound" onclick={toggleSound} aria-label={soundOn ? 'Silenciar' : 'Activar sonido'}>{soundOn ? '🔊' : '🔈'}</button>

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
        <span class="hud tl"></span><span class="hud tr"></span><span class="hud bl"></span><span class="hud br"></span>
        <div class="sheet-head">
          <div class="titles">
            <span class="eyebrow">{open.type === 'office' ? 'Proenza · Agenda' : open.type === 'reception' ? 'Proenza · Casos' : 'Proenza · Biblioteca'}</span>
            <h3>{open.type === 'office' ? 'Agenda tu cita' : open.type === 'reception' ? 'Deja tu caso' : 'Biblioteca jurídica'}</h3>
          </div>
          <button class="x" onclick={closeStation} aria-label="Cerrar">✕</button>
        </div>
        <div class="sheet-body">
          {#if open.type === 'office'}
            <div class="law">
              {#if open.lawyer.photo}<img class="avatar" src={open.lawyer.photo} alt={open.lawyer.name} />{:else}<span class="mono">{initials(open.lawyer.name)}</span>{/if}
              <div><b>{open.lawyer.name}</b><small>{open.lawyer.role}</small></div>
            </div>
            <p>{open.lawyer.bio}</p>
            {#if sent}
              <div class="confirm">
                <span class="confirm-ic"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>
                <b>{sent === 'citaly' ? '¡Te abrimos la agenda!' : '¡Solicitud lista!'}</b>
                <p>{sent === 'citaly' ? 'Elige tu horario en la pestaña de Citaly que acabamos de abrir. Si no se abrió, escríbenos al ' + site.phone + '.' : 'Te llevamos a WhatsApp para confirmar. Si no se abrió, escríbenos al ' + site.phone + '.'}</p>
                <button class="send alt" type="button" onclick={closeStation}>Cerrar</button>
              </div>
            {:else}
              <button class="send" type="button" onclick={() => agendarCitaly(open.lawyer)}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                Agendar en Citaly
              </button>
              <div class="orline"><span>o solicita por WhatsApp</span></div>
              <form class="form" onsubmit={(e) => citaWhats(e, open.lawyer)}>
                <div class="row"><label>Nombre<input bind:value={f.nombre} required /></label><label>Contacto<input bind:value={f.contacto} required placeholder="WhatsApp / correo" /></label></div>
                <div class="row"><label>Fecha preferida<input type="date" bind:value={f.fecha} /></label><label>Detalle<input bind:value={f.mensaje} placeholder="opcional" /></label></div>
                <button class="send alt" type="submit">Solicitar por WhatsApp</button>
              </form>
            {/if}
          {:else if open.type === 'reception'}
            {#if sent}
              <div class="confirm">
                <span class="confirm-ic"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>
                <b>¡Caso enviado!</b>
                <p>Te llevamos a WhatsApp para que lo recibamos. Si no se abrió, escríbenos al {site.phone}.</p>
                <button class="send alt" type="button" onclick={closeStation}>Cerrar</button>
              </div>
            {:else}
              <p>Cuéntanos tu situación y nuestro equipo la analiza para orientarte.</p>
              <form class="form" onsubmit={casoWhats}>
                <div class="row"><label>Nombre<input bind:value={f.nombre} required /></label><label>Contacto<input bind:value={f.contacto} required placeholder="WhatsApp / correo" /></label></div>
                <label>Tu caso<textarea rows="4" bind:value={f.mensaje} required></textarea></label>
                <button class="send" type="submit">Enviar caso por WhatsApp</button>
              </form>
            {/if}
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
  .demo { position: fixed; inset: 0; overflow: hidden; background: #cdd6df; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
  canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
  .nav { position: absolute; top: 16px; left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; pointer-events: none; }
  .brand { background: rgba(255,255,255,0.88); backdrop-filter: blur(8px); border-radius: 10px; padding: 0.5rem 0.9rem; box-shadow: 0 6px 20px rgba(0,0,0,0.15); pointer-events: auto; }
  .brand img { height: 30px; display: block; }
  .nav .contact { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; pointer-events: auto; }
  .nav .contact span { background: rgba(255,255,255,0.16); backdrop-filter: blur(8px); color: #fff; font-size: 0.72rem; padding: 0.4rem 0.8rem; border-radius: 999px; text-shadow: 0 1px 4px rgba(0,0,0,0.4); }
  .social { display: flex; gap: 0.35rem; }
  .social a { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; background: rgba(255,255,255,0.18); backdrop-filter: blur(8px); color: #fff; font-size: 0.62rem; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }
  .social a:hover { background: rgba(255,255,255,0.35); }
  .explore { position: absolute; top: 50%; right: 4vw; transform: translateY(-50%); width: 270px; background: rgba(16,24,34,0.18); backdrop-filter: blur(26px) saturate(1.3); -webkit-backdrop-filter: blur(26px) saturate(1.3); border: 1px solid rgba(255,255,255,0.14); border-radius: 20px; padding: 1.3rem; color: #fff; text-shadow: 0 1px 5px rgba(0,0,0,0.55); box-shadow: 0 24px 60px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.22); }
  .explore h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 1.45rem; line-height: 1.05; margin: 0 0 0.8rem; letter-spacing: 0.01em; }
  .explore .poi { font-size: 0.78rem; opacity: 0.85; margin: 0 0 0.4rem; }
  .explore ul { list-style: none; margin: 0 0 0.8rem; padding: 0; display: grid; gap: 0.3rem; font-size: 0.84rem; }
  .explore li.done { color: #9fe6c0; }
  .explore .next { font-size: 0.8rem; margin: 0 0 0.9rem; }
  .cta { display: block; width: 100%; text-align: center; padding: 0.7rem; border: 1px solid rgba(255,255,255,0.32); background: rgba(255,255,255,0.10); color: #fff; border-radius: 999px; font: inherit; font-size: 0.78rem; letter-spacing: 0.02em; cursor: pointer; transition: background 0.18s, border-color 0.18s; }
  .cta:hover { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.55); }
  .cta.ghost { opacity: 0.6; cursor: default; }
  .prompt { position: absolute; left: 50%; bottom: 12vh; transform: translateX(-50%); background: rgba(16,24,34,0.42); backdrop-filter: blur(18px) saturate(1.3); -webkit-backdrop-filter: blur(18px) saturate(1.3); border: 1px solid rgba(255,255,255,0.22); color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.55); padding: 0.5rem 1rem 0.5rem 0.55rem; border-radius: 999px; font-size: 0.88rem; box-shadow: 0 10px 30px rgba(0,0,0,0.28); display: flex; align-items: center; gap: 0.55rem; }
  .prompt .key { background: rgba(255,255,255,0.92); color: #14202e; border-radius: 6px; padding: 1px 7px; font-size: 0.72rem; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
  .toast { position: absolute; left: 50%; top: 12%; transform: translateX(-50%); background: rgba(20,28,38,0.9); color: #fff; padding: 0.7rem 1.1rem; border-radius: 12px; font-size: 0.9rem; }
  .hint { position: absolute; right: 16px; bottom: 14px; color: #fff; font-size: 0.64rem; letter-spacing: 0.08em; text-align: right; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
  .badge { position: absolute; left: 16px; bottom: 14px; color: rgba(255,255,255,0.85); font-size: 0.64rem; letter-spacing: 0.08em; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
  .compass { position: absolute; right: 18px; bottom: 44px; width: 52px; height: 52px; border-radius: 50%; background: rgba(20,28,38,0.5); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.3); pointer-events: none; }
  .compass .dial { width: 100%; height: 100%; position: relative; }
  .compass .n { position: absolute; top: 2px; left: 50%; transform: translateX(-50%); color: #ffd166; font-size: 0.6rem; font-weight: 700; }
  .compass .needle { position: absolute; top: 9px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-bottom: 15px solid #e0533f; }
  .sound { position: absolute; right: 18px; bottom: 104px; width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3); background: rgba(20,28,38,0.5); backdrop-filter: blur(6px); color: #fff; font-size: 1rem; cursor: pointer; }
  .mctrl { position: absolute; left: 16px; bottom: 40px; display: none; align-items: center; gap: 8px; z-index: 10; }
  .mctrl button { width: 50px; height: 50px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.3); background: rgba(20,28,38,0.5); backdrop-filter: blur(6px); color: #fff; font-size: 1.05rem; cursor: pointer; touch-action: none; user-select: none; display: grid; place-items: center; }
  .mctrl .mcol { display: grid; gap: 6px; }
  .mctrl .mcol button { height: 44px; }
  @media (pointer: coarse) { .mctrl { display: flex; } .badge { display: none; } }
  @media (max-width: 720px) { .mctrl { display: flex; } }
  .loader { position: absolute; inset: 0; display: grid; place-content: center; color: #33414f; }

  .overlay { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; z-index: 20; }
  .scrim { position: absolute; inset: 0; border: 0; cursor: pointer; animation: fade 0.35s ease;
    background: radial-gradient(130% 120% at 50% 38%, rgba(12,26,46,0.42), rgba(3,7,16,0.74)); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }

  /* --- Panel holográfico flotante --- */
  .sheet {
    position: relative; width: min(660px, 92vw); max-height: 86vh; display: flex; flex-direction: column;
    border: 1px solid transparent; border-radius: 18px; color: #e9f3fb; overflow: hidden;
    background:
      linear-gradient(158deg, rgba(13,24,42,0.82), rgba(7,14,28,0.9)) padding-box,
      linear-gradient(135deg, rgba(110,214,255,0.75), rgba(120,140,255,0.2) 45%, rgba(110,214,255,0.55)) border-box;
    backdrop-filter: blur(22px) saturate(1.4); -webkit-backdrop-filter: blur(22px) saturate(1.4);
    box-shadow: 0 30px 90px rgba(0,0,0,0.55), 0 0 70px rgba(70,170,255,0.16), inset 0 1px 0 rgba(160,225,255,0.22);
    animation: sheetIn 0.5s cubic-bezier(0.16,0.84,0.3,1);
  }
  .sheet::before { content: ''; position: absolute; inset: 0; pointer-events: none; border-radius: inherit; opacity: 0.5;
    background: repeating-linear-gradient(0deg, rgba(150,210,255,0.05) 0 1px, transparent 1px 4px); }
  .sheet::after { content: ''; position: absolute; left: 9%; right: 9%; top: 0; height: 1px; pointer-events: none;
    background: linear-gradient(90deg, transparent, rgba(150,220,255,0.9), transparent); box-shadow: 0 0 12px rgba(120,200,255,0.7); }
  .hud { position: absolute; width: 17px; height: 17px; pointer-events: none; z-index: 2; border: 1.5px solid rgba(125,215,255,0.85); }
  .hud.tl { top: 9px; left: 9px; border-right: 0; border-bottom: 0; border-top-left-radius: 6px; }
  .hud.tr { top: 9px; right: 9px; border-left: 0; border-bottom: 0; border-top-right-radius: 6px; }
  .hud.bl { bottom: 9px; left: 9px; border-right: 0; border-top: 0; border-bottom-left-radius: 6px; }
  .hud.br { bottom: 9px; right: 9px; border-left: 0; border-top: 0; border-bottom-right-radius: 6px; }

  .sheet-head { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 1.3rem 1.5rem 1rem; border-bottom: 1px solid rgba(130,190,240,0.14); }
  .eyebrow { display: block; font-size: 0.64rem; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: #7fd3ff; margin-bottom: 0.4rem; }
  .sheet-head h3 { margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 1.9rem; line-height: 1.04; color: #f3f9ff; letter-spacing: 0.01em; }
  .x { width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(140,200,245,0.3); background: rgba(255,255,255,0.06); color: #cfe6f7; cursor: pointer; flex-shrink: 0; transition: background 0.18s, border-color 0.18s; }
  .x:hover { background: rgba(125,215,255,0.18); border-color: rgba(125,215,255,0.6); }

  .sheet-body { position: relative; z-index: 1; padding: 1.25rem 1.5rem 1.5rem; overflow-y: auto; }
  .sheet-body p { color: #b6c8da; line-height: 1.6; font-size: 0.92rem; }
  .law { display: flex; align-items: center; gap: 0.85rem; margin-bottom: 0.7rem; }
  .mono { width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(150deg, #1b4d89, #0e2c52); color: #fff; font-weight: 700; box-shadow: 0 0 0 1px rgba(125,215,255,0.4), 0 0 18px rgba(70,160,255,0.3); }
  .avatar { width: 54px; height: 54px; border-radius: 50%; object-fit: cover; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(125,215,255,0.5), 0 0 18px rgba(70,160,255,0.35); }
  .law b { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.32rem; font-weight: 600; color: #f3f9ff; }
  .law small { display: block; color: #7fd3ff; font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 0.15rem; }

  .form { display: grid; gap: 0.9rem; margin-top: 0.9rem; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }
  label { display: grid; gap: 0.35rem; font-size: 0.62rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #8fa6bb; }
  input, textarea { font: inherit; font-size: 0.9rem; font-weight: 400; letter-spacing: normal; text-transform: none; color: #eaf3fb; padding: 0.65rem 0.8rem; border: 1px solid rgba(130,190,240,0.22); border-radius: 10px; background: rgba(8,16,30,0.5); transition: border-color 0.18s, box-shadow 0.18s; }
  input::placeholder, textarea::placeholder { color: #61748a; }
  input:focus, textarea:focus { outline: 0; border-color: rgba(125,215,255,0.8); box-shadow: 0 0 0 3px rgba(95,200,255,0.15), 0 0 16px rgba(80,180,255,0.2); }
  .send { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; margin-top: 0.3rem; padding: 0.85rem; border: 1px solid rgba(160,225,255,0.5); border-radius: 999px; background: linear-gradient(180deg, rgba(110,205,255,0.95), rgba(70,150,235,0.95)); color: #04121f; font: inherit; font-weight: 700; letter-spacing: 0.04em; cursor: pointer; box-shadow: 0 6px 22px rgba(50,140,235,0.35), inset 0 1px 0 rgba(255,255,255,0.4); transition: transform 0.15s, box-shadow 0.15s, background 0.18s; }
  .send:hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(50,140,235,0.5), inset 0 1px 0 rgba(255,255,255,0.5); }
  .send.alt { background: rgba(255,255,255,0.06); border-color: rgba(140,200,245,0.4); color: #cfe6f7; box-shadow: none; }
  .send.alt:hover { background: rgba(125,215,255,0.16); transform: translateY(-1px); box-shadow: none; }
  .orline { display: flex; align-items: center; gap: 0.7rem; margin: 1.1rem 0 0.4rem; color: #7e93a8; font-size: 0.64rem; letter-spacing: 0.14em; text-transform: uppercase; }
  .orline span { white-space: nowrap; }
  .orline::before, .orline::after { content: ''; flex: 1; height: 1px; background: rgba(130,190,240,0.18); }
  .confirm { display: grid; justify-items: center; text-align: center; gap: 0.55rem; padding: 1.2rem 0.5rem 0.4rem; }
  .confirm-ic { width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; color: #7fffc4; border: 1.5px solid rgba(95,230,170,0.5); background: rgba(40,90,70,0.3); box-shadow: 0 0 24px rgba(60,220,150,0.25); }
  .confirm b { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.5rem; font-weight: 600; color: #f3f9ff; }
  .confirm p { color: #b6c8da; font-size: 0.86rem; margin: 0; max-width: 360px; }
  .confirm .send { width: auto; padding: 0.65rem 1.8rem; margin-top: 0.7rem; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
  .card { text-align: left; border: 1px solid rgba(130,190,240,0.2); background: linear-gradient(160deg, rgba(16,30,52,0.6), rgba(9,18,34,0.6)); border-radius: 14px; padding: 1rem 1.1rem; cursor: pointer; display: grid; gap: 0.35rem; color: #e9f3fb; transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s; }
  .card:hover { border-color: rgba(125,215,255,0.6); transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.4), 0 0 24px rgba(70,160,255,0.2); }
  .card b { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.18rem; font-weight: 600; color: #f3f9ff; line-height: 1.15; }
  .card small { color: #8fa6bb; font-size: 0.72rem; }
  .tag { font-size: 0.6rem; color: #7fd3ff; text-transform: uppercase; letter-spacing: 0.18em; }
  .back { background: none; border: 0; color: #7fd3ff; font-weight: 600; cursor: pointer; padding: 0 0 0.7rem; letter-spacing: 0.04em; }
  .prose { color: #c2d2e2; line-height: 1.65; }
  .prose h4 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 1.5rem; color: #f3f9ff; margin: 0 0 0.6rem; }
  .prose :global(h2) { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.2rem; color: #eaf3fb; margin-top: 1.2rem; }

  @keyframes sheetIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  @media (max-width: 720px) {
    .explore { top: 60px; right: 8px; left: auto; bottom: auto; transform: none; width: 165px; padding: 0.8rem; max-height: 50vh; overflow: auto; }
    .explore h2 { font-size: 0.82rem; margin-bottom: 0.5rem; }
    .explore .poi { display: none; }
    .explore ul { font-size: 0.74rem; gap: 0.2rem; margin-bottom: 0.5rem; }
    .explore .next { font-size: 0.72rem; margin-bottom: 0.6rem; }
    .cta { padding: 0.55rem; font-size: 0.72rem; }
    .brand img { height: 22px; }
    .social { display: none; }
    .nav .contact span { font-size: 0.64rem; padding: 0.32rem 0.6rem; }
    .nav { top: 12px; left: 12px; right: 12px; }
    .prompt { bottom: 17vh; font-size: 0.82rem; }
    .row { grid-template-columns: 1fr; }
    .grid { grid-template-columns: 1fr; }
  }
</style>
