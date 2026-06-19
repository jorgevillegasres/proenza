<script>
  import { onMount } from 'svelte'
  import { buildWorld } from './world.js'
  import { createAvatar } from './avatar.js'
  import Panel from './Panel.svelte'
  import { site } from '$lib/data/site.js'

  // Texturas pintadas a mano (Higgsfield). Para añadir una: guárdala en
  // src/lib/assets/textures/, impórtala aquí y añádela al objeto `textures`.
  import woodGhibli from '$lib/assets/textures/wood-ghibli.jpg'
  import rugGhibli from '$lib/assets/textures/rug-ghibli.jpg'
  import marbleGhibli from '$lib/assets/textures/marble-ghibli.jpg'
  import foliageGhibli from '$lib/assets/textures/foliage-ghibli.jpg'
  import floorGhibli from '$lib/assets/textures/floor-ghibli.jpg'
  import wallGhibli from '$lib/assets/textures/wall-ghibli.jpg'
  import skyGhibli from '$lib/assets/textures/sky-ghibli.jpg'
  import ambienteUrl from '$lib/assets/audio/ambiente.m4a'
  import deskModelUrl from '$lib/assets/models/desk.glb'
  import bookshelfModelUrl from '$lib/assets/models/bookshelf.glb'
  import tableModelUrl from '$lib/assets/models/table.glb'
  import sofaModelUrl from '$lib/assets/models/sofa.glb'
  import armchairModelUrl from '$lib/assets/models/armchair.glb'
  import counterModelUrl from '$lib/assets/models/counter.glb'
  import plantModelUrl from '$lib/assets/models/plant.glb'
  const textures = {
    wood: woodGhibli,
    rug: rugGhibli,
    marble: marbleGhibli,
    foliage: foliageGhibli,
    floor: floorGhibli,
    wall: wallGhibli,
  }

  const SPEED = 7.5
  const GRAVITY = 26
  const JUMP = 10.5
  const NEAR = 3.2

  let canvas = $state(null)
  let labelEls = $state([])
  let stationsUI = $state([])
  let active = $state(-1)
  let openSection = $state(null)
  let menuOpen = $state(false)
  let showHint = $state(true)
  let webglFailed = $state(false)
  let ready = $state(false)
  let joy = $state({ active: false, ox: 0, oy: 0, kx: 0, ky: 0 })

  const keys = new Set()
  const touch = { active: false, x: 0, y: 0 }
  let paused = false

  // Música ambiente (silenciada por defecto; se activa con el botón).
  let soundOn = $state(false)
  let audioEl = null
  function toggleSound() {
    if (!audioEl) {
      audioEl = new Audio(ambienteUrl)
      audioEl.loop = true
      audioEl.volume = 0.35
    }
    if (soundOn) {
      audioEl.pause()
      soundOn = false
    } else {
      audioEl.play().then(() => (soundOn = true)).catch(() => (soundOn = false))
    }
  }

  function open(id) {
    openSection = id
    paused = true
    menuOpen = false
    keys.clear()
    touch.active = false
    touch.x = touch.y = 0
    joy = { ...joy, active: false }
  }
  function close() { openSection = null; paused = false }
  function navigate(id) { openSection = id }

  onMount(() => {
    let cleanup = () => {}
    let cancelled = false

    ;(async () => {
      let THREE
      try {
        THREE = await import('three')
      } catch {
        webglFailed = true
        return
      }
      if (cancelled) return

      let renderer
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
        if (!renderer.getContext()) throw new Error('no webgl')
      } catch {
        webglFailed = true
        return
      }
      const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 760
      renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.6 : 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.15

      const scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2(0x0b1730, 0.0052)
      const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 600)

      // --- cielo ---------------------------------------------------------------
      // Con textura pintada (Higgsfield) la mapeamos sobre la cúpula; si no, queda
      // el degradado procedural de respaldo.
      let skyMat
      if (skyGhibli) {
        const skyTex = new THREE.TextureLoader().load(skyGhibli)
        skyTex.colorSpace = THREE.SRGBColorSpace
        skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false })
      } else {
        skyMat = new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          uniforms: { top: { value: new THREE.Color(0x070d20) }, bottom: { value: new THREE.Color(0x1c3f6b) } },
          vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
          fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 bottom;
            void main(){ float h=normalize(vP).y*0.5+0.5; gl_FragColor=vec4(mix(bottom,top,smoothstep(0.0,1.0,h)),1.0); }`,
        })
      }
      const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 48, 32), skyMat)
      sky.rotation.y = Math.PI // mueve la costura del panorama detrás de la vista inicial
      scene.add(sky)

      // --- estrellas (dos capas para dar profundidad) -------------------------
      for (const [count, size, near, far, col] of [
        [900, 0.9, 140, 240, 0xcfe0ff],
        [600, 1.6, 180, 300, 0xffffff],
      ]) {
        const g = new THREE.BufferGeometry()
        const a = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
          const u = Math.acos(2 * pseudo(i + count) - 1)
          const th = 2 * Math.PI * pseudo(i + 13)
          const rr = near + pseudo(i + 7) * (far - near)
          a.set([rr * Math.sin(u) * Math.cos(th), rr * Math.cos(u), rr * Math.sin(u) * Math.sin(th)], i * 3)
        }
        g.setAttribute('position', new THREE.BufferAttribute(a, 3))
        scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: col, size, sizeAttenuation: true })))
      }

      // --- sol con resplandor (florece con el bloom) --------------------------
      const sunDir = new THREE.Vector3(0.5, 0.62, 0.32).normalize()
      const glowTex = radialTexture(THREE)
      const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1cf, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))
      sunGlow.position.copy(sunDir.clone().multiplyScalar(180))
      sunGlow.scale.setScalar(90)
      scene.add(sunGlow)

      // --- luces ---------------------------------------------------------------
      scene.add(new THREE.HemisphereLight(0xbcd6ff, 0x223b22, 0.9))
      const sun = new THREE.DirectionalLight(0xfff2d6, 2.6)
      sun.position.copy(sunDir.clone().multiplyScalar(45))
      sun.castShadow = true
      const sm = mobile ? 1024 : 2048
      sun.shadow.mapSize.set(sm, sm)
      sun.shadow.camera.near = 1
      sun.shadow.camera.far = 140
      const d = 30
      Object.assign(sun.shadow.camera, { left: -d, right: d, top: d, bottom: -d })
      sun.shadow.bias = -0.0004
      scene.add(sun, sun.target)
      scene.add(new THREE.DirectionalLight(0x88aaff, 0.35).translateX(-30).translateY(10))

      // --- mundo + avatar ------------------------------------------------------
      const world = buildWorld(THREE, { textures, models: true })
      scene.add(world.group)
      const R = world.radius
      const stations = world.stations
      stationsUI = stations.map((s) => ({ id: s.id, label: s.label, color: s.color, cta: !!s.cta }))

      // Muebles 3D (Higgsfield → GLTF optimizado). Cada modelo se escala a su
      // huella y se apoya en el piso; se clona en las posiciones de su zona.
      const FURNITURE = [
        { url: deskModelUrl, zone: 'abogados', size: 1.7, baseRot: 0, items: [[-1.4, -0.6, 0], [1.4, -0.6, 0], [0, 1.4, Math.PI]] },
        { url: bookshelfModelUrl, zone: 'blog', size: 1.9, baseRot: 0, items: [[-1.6, -1.0, 0.2], [0, -1.2, 0], [1.6, -1.0, -0.2]] },
        { url: armchairModelUrl, zone: 'blog', size: 1.2, baseRot: 0, items: [[-1.5, 1.3, 0.6]] },
        { url: tableModelUrl, zone: 'agendar', size: 3.0, baseRot: 0, items: [[0, 0, 0]] },
        { url: sofaModelUrl, zone: 'recepcion', size: 2.2, baseRot: 0, items: [[-1.7, 1.8, 0]] },
        { url: counterModelUrl, zone: 'recepcion', size: 3.0, baseRot: 0, items: [[0, -0.5, 0]] },
        { url: deskModelUrl, zone: 'caso', size: 2.0, baseRot: 0, items: [[0, -0.4, 0]] },
        { url: sofaModelUrl, zone: 'areas', size: 2.6, baseRot: 0, items: [[0, 0.6, 0]] },
        { url: armchairModelUrl, zone: 'contacto', size: 1.4, baseRot: 0, items: [[0, 0.5, 0]] },
      ]
      ;(async () => {
        let GLTFLoader
        try {
          ;({ GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js'))
        } catch {
          return
        }
        const loader = new GLTFLoader()
        for (const f of FURNITURE) {
          const zone = stations.find((s) => s.id === f.zone)?.group
          if (!zone) continue
          let base
          try {
            base = (await loader.loadAsync(f.url)).scene
          } catch {
            continue
          }
          const size = new THREE.Vector3()
          new THREE.Box3().setFromObject(base).getSize(size)
          base.scale.setScalar(f.size / Math.max(size.x, size.z, 0.001))
          base.updateMatrixWorld(true)
          const yOff = -new THREE.Box3().setFromObject(base).min.y
          base.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true
              o.receiveShadow = true
            }
          })
          for (const [x, z, ry] of f.items) {
            const inst = base.clone()
            inst.position.set(x, yOff, z)
            inst.rotation.y = ry + f.baseRot
            zone.add(inst)
          }
        }

        // Plantas: un modelo 3D por cada slot recogido en buildWorld.
        if (world.plantSlots?.length) {
          let pbase = null
          try {
            pbase = (await loader.loadAsync(plantModelUrl)).scene
          } catch {}
          if (pbase) {
            const psize = new THREE.Vector3()
            new THREE.Box3().setFromObject(pbase).getSize(psize)
            pbase.scale.setScalar(1.3 / Math.max(psize.x, psize.z, 0.001))
            pbase.updateMatrixWorld(true)
            const pyOff = -new THREE.Box3().setFromObject(pbase).min.y
            pbase.traverse((o) => {
              if (o.isMesh) {
                o.castShadow = true
                o.receiveShadow = true
              }
            })
            for (const slot of world.plantSlots) {
              const inst = pbase.clone()
              const s = slot.s || 1
              inst.scale.multiplyScalar(s)
              inst.position.set(slot.x, pyOff * s, slot.z)
              slot.parent.add(inst)
            }
          }
        }
      })()

      const avatar = createAvatar(THREE)
      scene.add(avatar)

      // spawn junto a recepción, mirándola
      const spawn = stations.find((s) => s.id === 'recepcion') || stations[0]
      let pos = spawn.worldPos.clone().normalize().multiplyScalar(R)
      {
        const upS = pos.clone().normalize()
        // Nace por delante de la recepción (su lado "frente") para ver el letrero.
        let tan = spawn.front ? spawn.front.clone() : new THREE.Vector3(0, 1, 0).cross(upS)
        tan.sub(upS.clone().multiplyScalar(tan.dot(upS)))
        if (tan.lengthSq() < 1e-4) tan = new THREE.Vector3(0, 1, 0).cross(upS)
        pos.addScaledVector(tan.normalize(), 5).normalize().multiplyScalar(R)
      }
      let height = 0, velY = 0, grounded = true
      const forward = spawn.worldPos.clone().sub(pos)
      {
        const upS = pos.clone().normalize()
        forward.sub(upS.clone().multiplyScalar(forward.dot(upS)))
        if (forward.lengthSq() < 1e-6) forward.set(0, 0, 1)
        forward.normalize()
      }

      const tmp = new THREE.Vector3()
      function orient() {
        const up = pos.clone().normalize()
        const z = forward.clone().sub(up.clone().multiplyScalar(forward.dot(up)))
        if (z.lengthSq() < 1e-6) return
        z.normalize()
        const x = new THREE.Vector3().crossVectors(up, z).normalize()
        avatar.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, z))
      }
      orient()
      avatar.position.copy(pos)
      {
        const up0 = pos.clone().normalize()
        camera.position.copy(avatar.position).addScaledVector(up0, 5).addScaledVector(forward.clone().negate(), 9)
        camera.up.copy(up0)
        camera.lookAt(avatar.position.clone().addScaledVector(up0, 1.4))
      }

      // --- post-procesado (bloom) ---------------------------------------------
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
        const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), mobile ? 0.5 : 0.7, 0.5, 0.82)
        composer.addPass(bloom)
        composer.addPass(new OutputPass())
        composer._bloom = bloom
      } catch {
        composer = null
      }

      function resize() {
        const w = innerWidth, h = innerHeight
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        composer?.setSize(w, h)
      }
      resize()

      // --- cámara orbital (3ª persona, con giro arrastrando) -------------------
      let camPitch = 0.5
      const camDist = mobile ? 8.6 : 7.6
      const boom = forward.clone().negate() // dirección jugador→cámara (tangente)
      let pendingYaw = 0
      let autoFollow = 0 // segundos en que se pausa el auto-seguimiento tras arrastrar
      const rotateCam = (dx, dy) => {
        pendingYaw += dx * 0.005
        camPitch = clamp(camPitch - dy * 0.005, 0.16, 1.05)
        autoFollow = 1.6
      }

      // --- input ---------------------------------------------------------------
      const onKeyDown = (e) => {
        const k = e.key.toLowerCase()
        if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault()
        if (k === 'escape') { if (openSection) close(); return }
        if (paused) return
        if (k === 'e') { if (active >= 0) open(stations[active].id); return }
        keys.add(k === ' ' ? 'space' : k)
        showHint = false
      }
      const onKeyUp = (e) => keys.delete(e.key.toLowerCase() === ' ' ? 'space' : e.key.toLowerCase())
      addEventListener('keydown', onKeyDown)
      addEventListener('keyup', onKeyUp)
      addEventListener('resize', resize)

      // Táctil: mitad izquierda = joystick de movimiento; mitad derecha = giro de
      // cámara. Ratón (escritorio): arrastrar = giro de cámara.
      const maxR = 60
      let moveTid = null, moveOrig = null
      let camTid = null, camLast = null
      let mouseDown = false, mouseLast = null
      const ts = (e) => {
        if (paused) return
        for (const t of e.changedTouches) {
          if (t.clientX < innerWidth * 0.5 && moveTid === null) {
            moveTid = t.identifier
            moveOrig = { x: t.clientX, y: t.clientY }
            touch.active = true
            joy = { active: true, ox: t.clientX, oy: t.clientY, kx: t.clientX, ky: t.clientY }
            showHint = false
          } else if (camTid === null) {
            camTid = t.identifier
            camLast = { x: t.clientX, y: t.clientY }
          }
        }
      }
      const tm = (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === moveTid && moveOrig) {
            touch.x = clamp((t.clientX - moveOrig.x) / maxR, -1, 1)
            touch.y = clamp((t.clientY - moveOrig.y) / maxR, -1, 1)
            joy = { active: true, ox: moveOrig.x, oy: moveOrig.y, kx: moveOrig.x + touch.x * maxR, ky: moveOrig.y + touch.y * maxR }
          } else if (t.identifier === camTid && camLast) {
            rotateCam(t.clientX - camLast.x, t.clientY - camLast.y)
            camLast = { x: t.clientX, y: t.clientY }
          }
        }
      }
      const te = (e) => {
        for (const t of e.changedTouches) {
          if (t.identifier === moveTid) { moveTid = null; moveOrig = null; touch.active = false; touch.x = touch.y = 0; joy = { ...joy, active: false } }
          if (t.identifier === camTid) { camTid = null; camLast = null }
        }
      }
      const md = (e) => { if (paused) return; mouseDown = true; mouseLast = { x: e.clientX, y: e.clientY }; canvas.style.cursor = 'grabbing' }
      const mm = (e) => { if (!mouseDown) return; rotateCam(e.clientX - mouseLast.x, e.clientY - mouseLast.y); mouseLast = { x: e.clientX, y: e.clientY } }
      const mu = () => { mouseDown = false; canvas.style.cursor = 'grab' }
      canvas.style.cursor = 'grab'
      canvas.addEventListener('touchstart', ts, { passive: true })
      canvas.addEventListener('touchmove', tm, { passive: true })
      canvas.addEventListener('touchend', te, { passive: true })
      canvas.addEventListener('mousedown', md)
      addEventListener('mousemove', mm)
      addEventListener('mouseup', mu)

      // --- loop ----------------------------------------------------------------
      const clock = new THREE.Clock()
      let raf = 0, walk = 0, pausedYaw = 0

      function frame() {
        raf = requestAnimationFrame(frame)
        const dt = Math.min(clock.getDelta(), 0.05)
        const t = clock.elapsedTime
        const up = pos.clone().normalize()

        if (!paused) {
          let camF = tmp.subVectors(pos, camera.position)
          camF.sub(up.clone().multiplyScalar(camF.dot(up)))
          if (camF.lengthSq() < 1e-6) camF.copy(forward)
          camF.normalize()
          const camR = new THREE.Vector3().crossVectors(up, camF).normalize()

          let f = 0, r = 0
          if (keys.has('w') || keys.has('arrowup')) f += 1
          if (keys.has('s') || keys.has('arrowdown')) f -= 1
          if (keys.has('d') || keys.has('arrowright')) r += 1
          if (keys.has('a') || keys.has('arrowleft')) r -= 1
          if (touch.active) { f += -touch.y; r += touch.x }
          if (keys.has('space') && grounded) { velY = JUMP; grounded = false }

          const move = new THREE.Vector3().addScaledVector(camF, f).addScaledVector(camR, r)
          const moving = move.lengthSq() > 1e-4
          if (moving) { move.normalize(); pos.addScaledVector(move, SPEED * dt); forward.copy(move) }

          velY -= GRAVITY * dt
          height += velY * dt
          if (height <= 0) { height = 0; velY = 0; grounded = true }
          pos.normalize().multiplyScalar(R + height)

          orient()
          const nUp = pos.clone().normalize()
          avatar.position.copy(nUp.clone().multiplyScalar(R + height))

          // animación de extremidades
          const legs = avatar.userData.legs, arms = avatar.userData.arms
          if (moving) {
            walk += dt * 11
            const s = Math.sin(walk) * 0.5
            legs[0].rotation.x = s; legs[1].rotation.x = -s
            arms[0].rotation.x = -s * 0.7; arms[1].rotation.x = s * 0.7
          } else {
            for (const p of [...legs, ...arms]) p.rotation.x *= 0.82
          }
          avatar.userData.torso.position.y = 0.7 + Math.sin(t * 2) * 0.012

          // Cámara orbital de 3ª persona.
          if (pendingYaw) { boom.applyAxisAngle(nUp, pendingYaw); pendingYaw = 0 }
          boom.sub(nUp.clone().multiplyScalar(boom.dot(nUp)))
          if (boom.lengthSq() < 1e-6) boom.copy(forward).negate()
          boom.normalize()
          if (moving && autoFollow <= 0) {
            boom.lerp(forward.clone().negate(), 1 - Math.pow(0.1, dt))
            boom.sub(nUp.clone().multiplyScalar(boom.dot(nUp)))
            if (boom.lengthSq() > 1e-6) boom.normalize()
          }
          autoFollow = Math.max(0, autoFollow - dt)
          const horiz = camDist * Math.cos(camPitch)
          const vert = camDist * Math.sin(camPitch)
          const camTarget = avatar.position.clone().addScaledVector(nUp, vert + 0.6).addScaledVector(boom, horiz)
          camera.position.lerp(camTarget, 1 - Math.pow(0.0012, dt))
          camera.up.copy(nUp)
          camera.lookAt(avatar.position.clone().addScaledVector(nUp, 1.5))

          let best = -1, bestD = NEAR
          for (let i = 0; i < stations.length; i++) {
            const dd = avatar.position.distanceTo(stations[i].worldPos)
            if (dd < bestD) { bestD = dd; best = i }
          }
          if (best !== active) active = best
        } else {
          // órbita cinematográfica detrás del panel
          pausedYaw += dt * 0.12
          const c = avatar.position.clone()
          const off = forward.clone().negate().applyAxisAngle(up, Math.sin(pausedYaw) * 0.5)
          const target = c.clone().addScaledVector(up, 4.2).addScaledVector(off, 7.5)
          camera.position.lerp(target, 1 - Math.pow(0.05, dt))
          camera.up.copy(up)
          camera.lookAt(c.clone().addScaledVector(up, 1.4))
        }

        // orbes + etiquetas (con desvanecido por distancia)
        const w = canvas.clientWidth, h = canvas.clientHeight
        for (let i = 0; i < stations.length; i++) {
          const s = stations[i]
          s.orb.position.y = 3.9 + Math.sin(t * 1.5 + i) * 0.16
          s.orb.rotation.y += 0.012
          const hot = i === active
          s.orb.material.emissiveIntensity += ((hot ? 1.6 : 1.0) - s.orb.material.emissiveIntensity) * 0.15
          s.halo.quaternion.copy(camera.quaternion)
          s.ring.material.emissiveIntensity = hot ? 0.8 : 0.35

          const v = s.anchor.clone().project(camera)
          const el = labelEls[i]
          if (el) {
            const dist = avatar.position.distanceTo(s.worldPos)
            const fade = clamp(1 - (dist - 10) / 26, 0.12, 1)
            const vis = v.z < 1
            el.style.transform = `translate(-50%,-50%) translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px)`
            el.style.opacity = vis ? (hot ? 1 : fade).toFixed(2) : '0'
            el.style.pointerEvents = vis ? 'auto' : 'none'
          }
        }

        if (composer) composer.render(); else renderer.render(scene, camera)
        if (!ready) ready = true
      }
      frame()

      cleanup = () => {
        cancelAnimationFrame(raf)
        removeEventListener('keydown', onKeyDown)
        removeEventListener('keyup', onKeyUp)
        removeEventListener('resize', resize)
        canvas.removeEventListener('touchstart', ts)
        canvas.removeEventListener('touchmove', tm)
        canvas.removeEventListener('touchend', te)
        canvas.removeEventListener('mousedown', md)
        removeEventListener('mousemove', mm)
        removeEventListener('mouseup', mu)
        composer?.dispose?.()
        renderer.dispose()
        scene.traverse((o) => {
          if (o.geometry) o.geometry.dispose()
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose())
        })
      }
    })()

    return () => { cancelled = true; cleanup() }
  })

  function jumpDown() { keys.add('space') }
  function jumpUp() { keys.delete('space') }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }
  function pseudo(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x) }
  function radialTexture(THREE) {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.25, 'rgba(255,240,200,0.85)')
    grd.addColorStop(1, 'rgba(255,240,200,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }
</script>

<div class="game">
  {#if !webglFailed}
    <canvas bind:this={canvas}></canvas>
    <div class="vignette"></div>

    <div class="labels" class:hidden={!!openSection}>
      {#each stationsUI as s, i}
        <button class="label" class:cta={s.cta} class:hot={i === active} style={`--c:${s.color}`} bind:this={labelEls[i]} onclick={() => open(s.id)}>
          <span class="dot"></span>{s.label}
        </button>
      {/each}
    </div>

    <header class="topbar">
      <button class="brand" onclick={() => open('recepcion')}>
        <span class="mark">P</span><span class="bn">{site.name}</span>
      </button>
      <div class="menu">
        <button class="menubtn" onclick={() => (menuOpen = !menuOpen)} aria-expanded={menuOpen}>Secciones ▾</button>
        {#if menuOpen}
          <div class="dropdown">
            {#each stationsUI as s}<button onclick={() => open(s.id)}>{s.label}</button>{/each}
          </div>
        {/if}
      </div>
    </header>

    <button class="sound" onclick={toggleSound} aria-label={soundOn ? 'Silenciar música' : 'Activar música ambiente'}>
      {soundOn ? '🔊' : '🔈'}
    </button>

    {#if active >= 0 && !openSection}
      <div class="prompt">
        <button class="enter" onclick={() => open(stationsUI[active].id)}>
          <span class="key">E</span> Entrar · <b>{stationsUI[active].label}</b>
        </button>
      </div>
    {/if}

    {#if showHint && !openSection}
      <div class="hint">Muévete con <b>WASD</b> o arrastra el dedo · explora el despacho</div>
    {/if}

    <!-- controles móviles -->
    {#if joy.active}
      <div class="joy-base" style={`left:${joy.ox}px; top:${joy.oy}px`}></div>
      <div class="joy-knob" style={`left:${joy.kx}px; top:${joy.ky}px`}></div>
    {/if}
    {#if !openSection}
      <button class="jump" ontouchstart={jumpDown} ontouchend={jumpUp} onpointerdown={jumpDown} onpointerup={jumpUp} aria-label="Saltar">⤒</button>
    {/if}

    {#if !ready}
      <div class="loader">
        <div class="lmark">P</div>
        <div class="lname">{site.name}</div>
        <div class="spinner"></div>
        <div class="ltext">Entrando al despacho…</div>
      </div>
    {/if}
  {:else}
    <div class="fallback">
      <h1>{site.name}</h1>
      <p>{site.tagline}</p>
      <div class="fgrid">
        {#each stationsUI.length ? stationsUI : [{ id: 'recepcion', label: 'Recepción' }] as s}
          <button class="fbtn" onclick={() => (openSection = s.id)}>{s.label}</button>
        {/each}
      </div>
    </div>
  {/if}

  {#if openSection}
    <Panel section={openSection} onClose={close} onNavigate={navigate} />
  {/if}
</div>

<style>
  .game { position: fixed; inset: 0; overflow: hidden; background: #0a1226; }
  canvas { display: block; width: 100%; height: 100%; touch-action: none; }
  .vignette { position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 200px 40px rgba(4, 8, 20, 0.55); }

  .labels { position: absolute; inset: 0; pointer-events: none; transition: opacity 0.2s ease; }
  .labels.hidden { opacity: 0; pointer-events: none; }
  .label {
    position: absolute; top: 0; left: 0; display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.32rem 0.72rem 0.32rem 0.48rem; background: rgba(255, 253, 248, 0.95);
    border: 1px solid var(--line); border-left: 3px solid var(--c); border-radius: 999px;
    box-shadow: var(--shadow-sm); font-family: var(--font-sans); font-size: 0.8rem; font-weight: 600;
    color: var(--ink); white-space: nowrap; cursor: pointer; will-change: transform, opacity;
    transition: box-shadow 0.15s ease;
  }
  .label .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }
  .label.hot { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 32%, transparent), var(--shadow-md); z-index: 3; }
  .label.cta { background: linear-gradient(180deg, var(--gold-bright), var(--gold)); border-color: transparent; color: #2a2008; }

  .topbar { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 0.7rem clamp(0.8rem, 3vw, 1.4rem); pointer-events: none; }
  .brand { display: inline-flex; align-items: center; gap: 0.55rem; background: rgba(10,18,38,0.6); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; padding: 0.35rem 0.95rem 0.35rem 0.4rem; cursor: pointer; pointer-events: auto; }
  .mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(150deg, var(--brand-bright), var(--ink)); color: #fff; font-family: var(--font-display); font-weight: 700; }
  .bn { color: #fff; font-family: var(--font-display); font-weight: 600; font-size: 1rem; }
  .menu { position: relative; pointer-events: auto; }
  .menubtn { background: rgba(10,18,38,0.6); backdrop-filter: blur(8px); color: #fff; border: 1px solid rgba(255,255,255,0.18); border-radius: 999px; padding: 0.5rem 1rem; font: inherit; font-weight: 600; cursor: pointer; }
  .dropdown { position: absolute; right: 0; top: calc(100% + 8px); background: var(--cream); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow-md); display: grid; padding: 0.4rem; min-width: 200px; }
  .dropdown button { text-align: left; background: none; border: 0; padding: 0.6rem 0.8rem; border-radius: 8px; font: inherit; color: var(--text); cursor: pointer; }
  .dropdown button:hover { background: #eaf1fb; color: var(--brand); }

  .prompt { position: absolute; left: 50%; bottom: clamp(1.2rem, 5vh, 2.4rem); transform: translateX(-50%); pointer-events: auto; }
  .enter { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255,253,248,0.97); border: 1px solid var(--line); border-radius: 999px; padding: 0.6rem 1.1rem; font: inherit; font-size: 0.95rem; color: var(--ink); cursor: pointer; box-shadow: var(--shadow-md); animation: pop 0.18s ease; }
  @keyframes pop { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .key { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 5px; background: var(--ink); color: #fff; font-size: 0.72rem; font-weight: 700; }

  .hint { position: absolute; left: 50%; bottom: clamp(4.5rem, 12vh, 6rem); transform: translateX(-50%); color: rgba(255,255,255,0.9); background: rgba(10,18,38,0.5); backdrop-filter: blur(6px); padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.84rem; white-space: nowrap; pointer-events: none; }

  .joy-base { position: absolute; width: 120px; height: 120px; border-radius: 50%; transform: translate(-50%,-50%); background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.25); pointer-events: none; }
  .joy-knob { position: absolute; width: 54px; height: 54px; border-radius: 50%; transform: translate(-50%,-50%); background: rgba(255,255,255,0.85); box-shadow: var(--shadow-md); pointer-events: none; }
  .jump { position: absolute; right: 22px; bottom: 28px; width: 64px; height: 64px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3); background: rgba(10,18,38,0.55); backdrop-filter: blur(8px); color: #fff; font-size: 1.5rem; cursor: pointer; display: none; }
  .sound { position: absolute; left: 16px; bottom: 20px; width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.22); background: rgba(10,18,38,0.55); backdrop-filter: blur(8px); color: #fff; font-size: 1.1rem; cursor: pointer; display: grid; place-items: center; }
  .sound:hover { background: rgba(10,18,38,0.75); }

  .loader { position: absolute; inset: 0; z-index: 70; display: grid; place-content: center; justify-items: center; gap: 0.7rem; background: radial-gradient(120% 100% at 50% 30%, #15294a, #0a1226); color: #fff; }
  .lmark { width: 64px; height: 64px; border-radius: 16px; display: grid; place-items: center; background: linear-gradient(150deg, var(--brand-bright), var(--ink)); font-family: var(--font-display); font-weight: 700; font-size: 2rem; }
  .lname { font-family: var(--font-display); font-size: 1.3rem; }
  .ltext { color: var(--text-on-dark-soft); font-size: 0.9rem; }
  .spinner { width: 30px; height: 30px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.2); border-top-color: var(--gold-bright); animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .fallback { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; color: #fff; padding: 2rem; background: radial-gradient(120% 100% at 50% 30%, #15294a, #0a1226); }
  .fallback h1 { color: #fff; }
  .fallback p { color: var(--text-on-dark-soft); max-width: 46ch; margin-inline: auto; }
  .fgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.7rem; margin-top: 1.5rem; max-width: 560px; }
  .fbtn { padding: 0.9rem 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.08); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  .fbtn:hover { background: rgba(255,255,255,0.16); }

  @media (pointer: coarse) {
    .jump { display: block; }
  }
  @media (max-width: 620px) {
    .jump { display: block; }
    .bn { display: none; }
    .label { font-size: 0.74rem; }
  }
</style>
