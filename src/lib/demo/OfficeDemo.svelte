<script>
  import { onMount } from 'svelte'
  import { site } from '$lib/data/site.js'

  // URLs de imágenes (fotorrealistas) inyectadas por la ruta.
  let { cityUrl = '', envUrl = '' } = $props()

  let canvas = $state(null)
  let ready = $state(false)
  let failed = $state(false)

  onMount(() => {
    let cleanup = () => {}
    let cancelled = false
    ;(async () => {
      let THREE
      try {
        THREE = await import('three')
      } catch {
        failed = true
        return
      }
      if (cancelled) return

      let renderer
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
        if (!renderer.getContext()) throw 0
      } catch {
        failed = true
        return
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 0.86

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xc7d2dd)
      const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 200)

      // --- iluminación de entorno (IBL) desde el panorama interior ------------
      if (envUrl) {
        const pmrem = new THREE.PMREMGenerator(renderer)
        pmrem.compileEquirectangularShader()
        new THREE.TextureLoader().load(envUrl, (tex) => {
          tex.mapping = THREE.EquirectangularReflectionMapping
          tex.colorSpace = THREE.SRGBColorSpace
          scene.environment = pmrem.fromEquirectangular(tex).texture
          if ('environmentIntensity' in scene) scene.environmentIntensity = 0.8
          tex.dispose()
          pmrem.dispose()
        })
      }

      // --- materiales ----------------------------------------------------------
      const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, ...opts })
      const floorMat = mat(0xb4b9bf, { roughness: 0.22, metalness: 0.0 }) // mármol pulido (refleja el env)
      const wallMat = mat(0xf2f2f0, { roughness: 0.9 })
      const ceilMat = mat(0xeeeeee, { roughness: 1 })
      const woodMat = mat(0x4a2f1d, { roughness: 0.45, metalness: 0.1 })
      const deskTop = mat(0x2a1c12, { roughness: 0.3 })
      const glassMat = new THREE.MeshStandardMaterial({ color: 0xbcd3e6, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.22 })
      const mullion = mat(0x20242a, { roughness: 0.6, metalness: 0.4 })
      const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d8, emissiveIntensity: 3 })

      // --- dimensiones de la sala ---------------------------------------------
      const W = 16, D = 11, H = 3.3
      const x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2

      const add = (mesh, cast = true, receive = true) => {
        mesh.castShadow = cast
        mesh.receiveShadow = receive
        scene.add(mesh)
        return mesh
      }
      const plane = (w, h, m, x, y, z, rx = 0, ry = 0) => {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m)
        p.position.set(x, y, z)
        p.rotation.set(rx, ry, 0)
        return add(p, false, true)
      }

      // piso y techo
      plane(W, D, floorMat, 0, 0, 0, -Math.PI / 2)
      plane(W, D, ceilMat, 0, H, 0, Math.PI / 2)
      // paredes (fondo, frente, izquierda = madera). derecha = ventanal.
      plane(W, H, woodMat, 0, H / 2, z0, 0, 0) // fondo (madera, con el letrero)
      plane(W, H, wallMat, 0, H / 2, z1, 0, Math.PI) // frente (entrada)
      plane(D, H, wallMat, x0, H / 2, 0, 0, Math.PI / 2) // izquierda

      // --- ventanal a la ciudad (pared derecha) -------------------------------
      const cityMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
      if (cityUrl) {
        const ctex = new THREE.TextureLoader().load(cityUrl, () => {})
        ctex.colorSpace = THREE.SRGBColorSpace
        cityMat.map = ctex
        cityMat.needsUpdate = true
      } else {
        cityMat.color.set(0xbcd3e6)
      }
      // plano de ciudad por fuera del ventanal
      plane(D * 2.2, H * 1.6, cityMat, x1 + 2.2, H / 2 + 0.2, 0, 0, -Math.PI / 2)
      // cristal + montantes verticales
      plane(D, H, glassMat, x1 - 0.02, H / 2, 0, 0, -Math.PI / 2)
      for (let i = 0; i <= 5; i++) {
        const z = z0 + (D * i) / 5
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, H, 0.07), mullion)
        bar.position.set(x1 - 0.03, H / 2, z)
        scene.add(bar)
      }
      plane(0.12, D, mullion, x1 - 0.03, 0.06, 0, -Math.PI / 2) // base
      plane(0.12, D, mullion, x1 - 0.03, H - 0.06, 0, -Math.PI / 2) // dintel

      // --- luces de techo lineales (emisivas + reales) ------------------------
      for (const zc of [-2.6, 0, 2.6]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, 0.05, 0.22), lightMat)
        strip.position.set(0, H - 0.03, zc)
        scene.add(strip)
        const pl = new THREE.PointLight(0xfff2de, 7, 14, 2)
        pl.position.set(0, H - 0.35, zc)
        scene.add(pl)
      }
      // luz de día desde el ventanal
      const day = new THREE.DirectionalLight(0xfff6e8, 1.4)
      day.position.set(18, 9, 4)
      day.castShadow = true
      day.shadow.mapSize.set(2048, 2048)
      day.shadow.camera.near = 1
      day.shadow.camera.far = 60
      Object.assign(day.shadow.camera, { left: -14, right: 14, top: 10, bottom: -10 })
      day.shadow.bias = -0.0005
      scene.add(day, day.target)
      scene.add(new THREE.AmbientLight(0xffffff, 0.05))

      // --- letrero PROENZA retroiluminado en la pared de madera ---------------
      {
        const c = document.createElement('canvas')
        c.width = 1024; c.height = 320
        const g = c.getContext('2d')
        g.clearRect(0, 0, c.width, c.height)
        g.fillStyle = '#fff7e6'
        g.textAlign = 'center'; g.textBaseline = 'middle'
        g.font = '700 150px Georgia, serif'
        g.fillText('PROENZA', c.width / 2, 130)
        g.font = '600 70px Georgia, serif'
        g.fillText('A B O G A D O S', c.width / 2, 240)
        const tex = new THREE.CanvasTexture(c)
        tex.colorSpace = THREE.SRGBColorSpace
        const signMat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffe9c0, emissiveMap: tex, emissiveIntensity: 1.4, transparent: true })
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.12), signMat)
        sign.position.set(-2.4, 1.95, z0 + 0.06)
        sign.rotation.y = 0
        scene.add(sign)
      }

      // --- escritorio de recepción --------------------------------------------
      {
        const desk = new THREE.Group()
        const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.05, 0.9), woodMat)
        body.position.y = 0.525
        const top = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 1.1), deskTop)
        top.position.y = 1.08
        body.castShadow = top.castShadow = true
        body.receiveShadow = top.receiveShadow = true
        desk.add(body, top)
        desk.position.set(-2.4, 0, z0 + 1.4)
        desk.rotation.y = 0
        scene.add(desk)
        // silla
        const chair = new THREE.Group()
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.55), mat(0x111316, { roughness: 0.5 }))
        seat.position.y = 0.5
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.08), mat(0x111316, { roughness: 0.5 }))
        back.position.set(0, 0.8, -0.24)
        seat.castShadow = back.castShadow = true
        chair.add(seat, back)
        chair.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), mullion).translateY(0.25))
        chair.position.set(-2.4, 0, z0 + 0.7)
        scene.add(chair)
      }

      // --- sofás de espera (junto al ventanal) --------------------------------
      const sofaMat = mat(0x2b2f36, { roughness: 0.7 })
      for (const zc of [-1.0, 1.2]) {
        const s = new THREE.Group()
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 0.85), sofaMat)
        base.position.y = 0.32
        const bk = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.2), sofaMat)
        bk.position.set(0, 0.6, -0.32)
        base.castShadow = bk.castShadow = base.receiveShadow = true
        s.add(base, bk)
        s.position.set(x1 - 1.4, 0, zc)
        s.rotation.y = -Math.PI / 2
        scene.add(s)
      }

      // --- post (bloom suave para luces/letrero) ------------------------------
      let composer = null
      try {
        const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
          import('three/examples/jsm/postprocessing/EffectComposer.js'),
          import('three/examples/jsm/postprocessing/RenderPass.js'),
          import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
          import('three/examples/jsm/postprocessing/OutputPass.js'),
        ])
        composer = new EffectComposer(renderer)
        composer.addPass(new RenderPass(scene, camera))
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.6, 0.9))
        composer.addPass(new OutputPass())
      } catch {
        composer = null
      }

      // --- cámara en primera persona ------------------------------------------
      const eye = 1.62
      const cpos = new THREE.Vector3(-1.2, eye, 4.5)
      let yaw = 0
      let pitch = -0.02
      const keys = new Set()
      const onKD = (e) => { keys.add(e.key.toLowerCase()); if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) e.preventDefault() }
      const onKU = (e) => keys.delete(e.key.toLowerCase())
      addEventListener('keydown', onKD)
      addEventListener('keyup', onKU)

      let dragging = false, lx = 0, ly = 0
      const sens = 0.0026
      const down = (x, y) => { dragging = true; lx = x; ly = y }
      const moveLook = (x, y) => {
        if (!dragging) return
        yaw -= (x - lx) * sens
        pitch = Math.max(-1.1, Math.min(0.9, pitch - (y - ly) * sens))
        lx = x; ly = y
      }
      const up = () => { dragging = false }
      const md = (e) => down(e.clientX, e.clientY)
      const mm = (e) => moveLook(e.clientX, e.clientY)
      const ts = (e) => { const t = e.touches[0]; down(t.clientX, t.clientY) }
      const tm = (e) => { const t = e.touches[0]; moveLook(t.clientX, t.clientY) }
      canvas.addEventListener('mousedown', md)
      addEventListener('mousemove', mm)
      addEventListener('mouseup', up)
      canvas.addEventListener('touchstart', ts, { passive: true })
      canvas.addEventListener('touchmove', tm, { passive: true })
      canvas.addEventListener('touchend', up)

      const resize = () => {
        renderer.setSize(innerWidth, innerHeight)
        camera.aspect = innerWidth / innerHeight
        camera.updateProjectionMatrix()
        composer?.setSize(innerWidth, innerHeight)
      }
      addEventListener('resize', resize)
      resize()

      const clock = new THREE.Clock()
      let raf = 0
      const fwd = new THREE.Vector3(), right = new THREE.Vector3(), tmpv = new THREE.Vector3()
      const SPEED = 3.2
      function frame() {
        raf = requestAnimationFrame(frame)
        const dt = Math.min(clock.getDelta(), 0.05)

        camera.rotation.order = 'YXZ'
        camera.rotation.y = yaw
        camera.rotation.x = pitch

        fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw))
        right.set(Math.cos(yaw), 0, -Math.sin(yaw))
        let mx = 0, mz = 0
        if (keys.has('w') || keys.has('arrowup')) mz += 1
        if (keys.has('s') || keys.has('arrowdown')) mz -= 1
        if (keys.has('d') || keys.has('arrowright')) mx += 1
        if (keys.has('a') || keys.has('arrowleft')) mx -= 1
        tmpv.set(0, 0, 0).addScaledVector(fwd, mz).addScaledVector(right, mx)
        if (tmpv.lengthSq() > 0) {
          tmpv.normalize()
          cpos.addScaledVector(tmpv, SPEED * dt)
          cpos.x = Math.max(x0 + 0.6, Math.min(x1 - 0.6, cpos.x))
          cpos.z = Math.max(z0 + 0.6, Math.min(z1 - 0.6, cpos.z))
        }
        cpos.y = eye
        camera.position.copy(cpos)

        if (composer) composer.render()
        else renderer.render(scene, camera)
        if (!ready) ready = true
      }
      frame()

      cleanup = () => {
        cancelAnimationFrame(raf)
        removeEventListener('keydown', onKD)
        removeEventListener('keyup', onKU)
        removeEventListener('mousemove', mm)
        removeEventListener('mouseup', up)
        removeEventListener('resize', resize)
        canvas.removeEventListener('mousedown', md)
        canvas.removeEventListener('touchstart', ts)
        canvas.removeEventListener('touchmove', tm)
        canvas.removeEventListener('touchend', up)
        composer?.dispose?.()
        renderer.dispose()
      }
    })()
    return () => { cancelled = true; cleanup() }
  })
</script>

<div class="demo">
  {#if !failed}
    <canvas bind:this={canvas}></canvas>
  {/if}

  <!-- barra de navegación -->
  <header class="nav">
    <nav>INICIO · SERVICIOS · NUESTRO EQUIPO · CLIENTES · CONTACTO</nav>
    <div class="contact">
      <span>{site.phone}</span><span>{site.email}</span>
    </div>
  </header>

  <!-- panel de información flotante -->
  <aside class="info">
    <h2>ESPECIALISTAS EN DERECHO CIVIL COLOMBIANO</h2>
    <ul>
      <li>Asesoría en Contratos</li>
      <li>Responsabilidad Civil</li>
      <li>Propiedad y Bienes</li>
      <li>Derecho de Familia</li>
      <li>Sucesiones</li>
      <li>Litigio Civil</li>
    </ul>
    <button>MÁS INFORMACIÓN</button>
  </aside>

  <div class="hint">EXPLORA EL DESPACHO USANDO <b>W, A, S, D</b> O ARRASTRA</div>
  <div class="badge">DEMO · oficina realista</div>

  {#if !ready && !failed}<div class="loader">Cargando despacho…</div>{/if}
</div>

<style>
  .demo { position: fixed; inset: 0; overflow: hidden; background: #c7d2dd; font-family: var(--ui-font, system-ui, sans-serif); }
  canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
  .nav { position: absolute; top: 18px; left: 18px; right: 18px; display: flex; justify-content: space-between; align-items: center; gap: 1rem; pointer-events: none; }
  .nav nav { background: rgba(255,255,255,0.16); backdrop-filter: blur(8px); color: #fff; font-size: 0.72rem; letter-spacing: 0.08em; padding: 0.6rem 1rem; border-radius: 8px; text-shadow: 0 1px 4px rgba(0,0,0,0.4); }
  .nav .contact { display: flex; gap: 0.8rem; }
  .nav .contact span { background: rgba(255,255,255,0.16); backdrop-filter: blur(8px); color: #fff; font-size: 0.72rem; padding: 0.5rem 0.8rem; border-radius: 999px; text-shadow: 0 1px 4px rgba(0,0,0,0.4); }
  .info { position: absolute; top: 50%; right: 5vw; transform: translateY(-50%); width: 260px; background: rgba(255,255,255,0.14); backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,0.3); border-radius: 16px; padding: 1.4rem; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.4); box-shadow: 0 18px 50px rgba(0,0,0,0.25); }
  .info h2 { font-size: 0.95rem; line-height: 1.3; margin: 0 0 0.9rem; }
  .info ul { margin: 0 0 1.1rem; padding-left: 1.1rem; display: grid; gap: 0.35rem; font-size: 0.85rem; }
  .info button { width: 100%; padding: 0.7rem; border: 1px solid rgba(255,255,255,0.5); background: rgba(255,255,255,0.12); color: #fff; border-radius: 999px; font: inherit; font-size: 0.82rem; cursor: pointer; }
  .info button:hover { background: rgba(255,255,255,0.25); }
  .hint { position: absolute; right: 18px; bottom: 16px; color: #fff; font-size: 0.66rem; letter-spacing: 0.1em; text-align: right; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
  .badge { position: absolute; left: 18px; bottom: 16px; color: rgba(255,255,255,0.85); font-size: 0.66rem; letter-spacing: 0.1em; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
  .loader { position: absolute; inset: 0; display: grid; place-content: center; color: #33414f; font-size: 1rem; }
  @media (max-width: 640px) { .info { right: 50%; transform: translate(50%, -50%); width: 80vw; max-width: 280px; } }
</style>
