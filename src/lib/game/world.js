// El planeta ES el despacho: la superficie es una planta de oficina abierta que
// envuelve todo el mundo. Cada "estación" es una zona amueblada (recepción,
// áreas, despachos, biblioteca, sala de juntas, admisión). Recibe THREE.

export const RADIUS = 16

const STATION_DEFS = [
  { id: 'recepcion', label: 'Recepción', color: '#c29a4b', dir: [0.34, 0.26, 0.92] },
  { id: 'areas', label: 'Áreas de práctica', color: '#2e6fb7', dir: [0.95, 0.12, 0.15] },
  { id: 'abogados', label: 'Nuestros abogados', color: '#1b4d89', dir: [0.5, 0.08, -0.92] },
  { id: 'blog', label: 'Biblioteca', color: '#3a86b5', dir: [-0.62, 0.18, -0.82] },
  { id: 'agendar', label: 'Sala de juntas', color: '#c29a4b', dir: [-0.95, 0.12, 0.18], cta: true },
  { id: 'caso', label: 'Admisión de casos', color: '#2e6fb7', dir: [-0.18, 0.95, 0.05] },
  { id: 'contacto', label: 'Contacto', color: '#1b4d89', dir: [0.22, -0.9, 0.3] },
]

export function buildWorld(THREE, options = {}) {
  const group = new THREE.Group()
  const mat = (color, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.04, ...opts })

  const P = {
    floor: mat(0xb08a5a),
    underfloor: mat(0x3a2c1f),
    wood: mat(0xb98a52),
    woodDark: mat(0x6f4a2b),
    rug: mat(0x21477e),
    runner: mat(0x173458),
    cream: mat(0xf2e9d6),
    white: mat(0xf6f3ec),
    navy: mat(0x183f6b),
    blue: mat(0x2e6fb7),
    leather: mat(0x6b4636, { roughness: 0.6 }),
    leaf: mat(0x3f7d54, { flatShading: true }),
    leaf2: mat(0x356b48, { flatShading: true }),
    gold: mat(0xc7a14e, { emissive: 0x5a4413, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.45 }),
    glass: mat(0xa7c8e6, { roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.5 }),
    green: new THREE.MeshStandardMaterial({ color: 0x2f7d4f, emissive: 0x35c074, emissiveIntensity: 1.3, roughness: 0.4 }),
    warm: new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd982, emissiveIntensity: 1.6, roughness: 0.5 }),
    paper: mat(0xefe7d4),
  }
  const BOOKS = [0x2e6fb7, 0x183f6b, 0xc29a4b, 0x3f7d54, 0x9aa0a8, 0xb04a3a, 0x7a5aa0]

  // --- superficie (piso de madera) ------------------------------------------
  const surface = new THREE.Mesh(new THREE.IcosahedronGeometry(RADIUS, 16), P.floor)
  surface.receiveShadow = true
  surface.castShadow = true
  group.add(surface)
  group.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 0.99, 48, 48), P.underfloor))

  // Halo atmosférico.
  group.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.16, 48, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { glowColor: { value: new THREE.Color(0x6fa8e8) }, power: { value: 3.2 } },
        vertexShader: `varying vec3 vN; varying vec3 vP;
          void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz; gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `varying vec3 vN; varying vec3 vP; uniform vec3 glowColor; uniform float power;
          void main(){ vec3 v=normalize(-vP); float f=pow(1.0-max(dot(vN,v),0.0),power); gl_FragColor=vec4(glowColor,f); }`,
      })
    )
  )

  // --- texturas pintadas a mano ---------------------------------------------
  const TEX = options.textures || {}
  const loader = new THREE.TextureLoader()
  const applyTex = (mats, url, repeat = 1, tint = 0xffffff) => {
    if (!url) return
    const t = loader.load(url)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    t.repeat.set(repeat, repeat)
    for (const m of mats) {
      m.map = t
      m.color.set(tint)
      m.flatShading = false
      m.needsUpdate = true
    }
  }
  applyTex([P.floor], TEX.floor || TEX.wood, 12) // piso de tablones (muy repetido)
  applyTex([P.wood, P.woodDark], TEX.wood, 1) // mobiliario
  applyTex([P.rug], TEX.rug, 1) // alfombras (un marco por alfombra)
  applyTex([P.cream, P.white], TEX.wall || TEX.marble, 2) // paredes/tabiques
  applyTex([P.leaf, P.leaf2], TEX.foliage, 2) // plantas

  const dirV = (d) => new THREE.Vector3(...d).normalize()
  const pointOnSurface = (dir, h = 0) => dir.clone().normalize().multiplyScalar(RADIUS + h)
  const orientTo = (obj, dir) =>
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  const placeOnSurface = (obj, dir, h = 0) => {
    obj.position.copy(pointOnSurface(dir, h))
    orientTo(obj, dir)
  }
  const slerpDir = (a, b, t) => {
    let dot = Math.max(-1, Math.min(1, a.dot(b)))
    const th = Math.acos(dot)
    if (th < 1e-4) return a.clone()
    const s = Math.sin(th)
    return a.clone().multiplyScalar(Math.sin((1 - t) * th) / s).add(b.clone().multiplyScalar(Math.sin(t * th) / s)).normalize()
  }

  // --- helpers de mobiliario -------------------------------------------------
  const box = (parent, w, h, d, m, x, y, z, ry = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
    mesh.position.set(x, y, z)
    mesh.rotation.y = ry
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  const cyl = (parent, rt, rb, h, m, x, y, z, seg = 14) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  const rug = (parent, w, d, x = 0, z = 0) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), P.rug)
    r.position.set(x, 0.03, z)
    r.receiveShadow = true
    parent.add(r)
    return r
  }
  const chair = (parent, x, z, ry = 0, m = P.navy) => {
    const g = new THREE.Group()
    box(g, 0.5, 0.1, 0.5, m, 0, 0.45, 0)
    box(g, 0.5, 0.5, 0.09, m, 0, 0.7, -0.21)
    for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(g, 0.06, 0.45, 0.06, P.woodDark, lx, 0.22, lz)
    g.position.set(x, 0, z)
    g.rotation.y = ry
    parent.add(g)
    return g
  }
  const bankerLamp = (parent, x, y, z) => {
    cyl(parent, 0.12, 0.14, 0.04, P.gold, x, y, z, 12)
    cyl(parent, 0.025, 0.025, 0.26, P.gold, x, y + 0.15, z, 8)
    const shade = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.22, 4, 8), P.green)
    shade.rotation.z = Math.PI / 2
    shade.position.set(x, y + 0.3, z)
    parent.add(shade)
  }
  const floorLamp = (parent, x, z) => {
    cyl(parent, 0.16, 0.18, 0.06, P.woodDark, x, 0.05, z, 12)
    cyl(parent, 0.03, 0.03, 1.5, P.gold, x, 0.8, z, 8)
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), P.warm)
    bulb.position.set(x, 1.6, z)
    parent.add(bulb)
    cyl(parent, 0.26, 0.2, 0.3, P.cream, x, 1.62, z, 16)
  }
  const plant = (parent, x, z, s = 1) => {
    const g = new THREE.Group()
    cyl(g, 0.22, 0.18, 0.4, P.woodDark, 0, 0.2, 0, 12)
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), P.leaf)
    f.position.y = 0.62
    f.scale.y = 1.25
    f.castShadow = true
    g.add(f)
    g.position.set(x, 0, z)
    g.scale.setScalar(s)
    parent.add(g)
  }
  const books = (parent, x, y, z, n = 6, ry = 0) => {
    const g = new THREE.Group()
    for (let j = 0; j < n; j++) box(g, 0.16, 0.42 + ((j * 7) % 4) * 0.03, 0.16, mat(BOOKS[(j + Math.floor(Math.abs(x) * 3)) % BOOKS.length]), -((n - 1) * 0.18) / 2 + j * 0.18, 0, 0)
    g.position.set(x, y, z)
    g.rotation.y = ry
    parent.add(g)
  }
  const bookshelf = (parent, x, z, ry) => {
    const g = new THREE.Group()
    box(g, 1.9, 2.6, 0.5, P.woodDark, 0, 1.3, 0)
    for (let i = 0; i < 4; i++) {
      box(g, 1.8, 0.08, 0.46, P.wood, 0, 0.55 + i * 0.62, 0.02)
      books(g, 0, 0.83 + i * 0.62, 0.12, 8)
    }
    g.position.set(x, 0, z)
    g.rotation.y = ry
    parent.add(g)
  }
  const framedPic = (parent, x, y, z, ry = 0, w = 0.5, h = 0.4, color = 0x183f6b) => {
    const g = new THREE.Group()
    box(g, w, h, 0.04, P.gold, 0, 0, 0)
    box(g, w - 0.1, h - 0.1, 0.05, mat(color), 0, 0, 0.01)
    g.position.set(x, y, z)
    g.rotation.y = ry
    parent.add(g)
  }
  const deskWithChair = (parent, x, z, ry) => {
    const g = new THREE.Group()
    box(g, 1.6, 0.12, 0.8, P.wood, 0, 0.72, 0) // tablero
    for (const [lx, lz] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) box(g, 0.1, 0.72, 0.1, P.woodDark, lx, 0.36, lz)
    box(g, 0.6, 0.04, 0.4, P.navy, -0.4, 0.8, 0) // carpeta/escritorio
    box(g, 0.45, 0.3, 0.04, P.navy, 0.45, 0.95, -0.1) // monitor
    box(g, 0.3, 0.22, 0.18, P.paper, 0.1, 0.86, 0.18) // pila de archivos
    bankerLamp(g, -0.5, 0.78, -0.2)
    chair(g, 0, 0.95, Math.PI)
    g.position.set(x, 0, z)
    g.rotation.y = ry
    parent.add(g)
  }

  // Textura de texto (canvas) para letreros legibles — corre en cliente.
  const makeTextTexture = (line1, line2) => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 320
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.fillStyle = '#c7a14e'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 168px Georgia, "Times New Roman", serif'
    ctx.fillText(line1, c.width / 2, 120)
    if (line2) {
      ctx.font = '600 84px Georgia, serif'
      ctx.fillText(line2.split('').join(' '), c.width / 2, 250)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }
  const sign = (parent, line1, line2, x, y, z, w = 3.0, h = 0.95) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: makeTextTexture(line1, line2), transparent: true, toneMapped: false })
    )
    m.position.set(x, y, z)
    parent.add(m)
    return m
  }
  const clock = (parent, x, y, z) => {
    const face = cyl(parent, 0.34, 0.34, 0.06, P.white, x, y, z, 22)
    face.rotation.x = Math.PI / 2
    cyl(parent, 0.37, 0.37, 0.04, P.gold, x, y, z - 0.01, 22).rotation.x = Math.PI / 2
    box(parent, 0.03, 0.22, 0.02, P.navy, x, y + 0.06, z + 0.04)
    box(parent, 0.16, 0.03, 0.02, P.navy, x + 0.05, y, z + 0.04)
  }

  // --- recibidor central: letrero + balanza de la justicia ------------------
  const plazaDir = dirV([0.18, 0.3, 0.96])
  const lobby = new THREE.Group()
  placeOnSurface(lobby, plazaDir)
  rug(lobby, 5.2, 5.2)
  // pedestal + balanza
  cyl(lobby, 0.5, 0.62, 0.5, P.cream, 0, 0.25, 0, 20)
  cyl(lobby, 0.05, 0.05, 1.0, P.gold, 0, 0.95, 0, 10)
  box(lobby, 1.5, 0.05, 0.05, P.gold, 0, 1.4, 0)
  for (const sx of [-0.6, 0.6]) {
    cyl(lobby, 0.02, 0.02, 0.3, P.gold, sx, 1.25, 0, 6)
    cyl(lobby, 0.18, 0.18, 0.06, P.gold, sx, 1.1, 0, 14)
  }
  floorLamp(lobby, -2, 1.6)
  floorLamp(lobby, 2, -1.6)
  plant(lobby, 2, 1.8, 1.1)
  plant(lobby, -2, -1.8, 1.1)
  group.add(lobby)

  // --- constructores por zona -----------------------------------------------
  const builders = {
    recepcion(g) {
      rug(g, 4.4, 4.4)
      // mostrador en L
      box(g, 3.0, 1.0, 0.8, P.navy, 0, 0.5, -0.6)
      box(g, 3.2, 0.14, 1.0, P.wood, 0, 1.05, -0.6)
      box(g, 0.8, 1.0, 1.6, P.navy, 1.5, 0.5, 0.2)
      box(g, 1.0, 0.14, 1.7, P.wood, 1.5, 1.05, 0.2)
      // pared con letrero PROENZA + diplomas + reloj
      box(g, 3.8, 2.2, 0.16, P.cream, 0, 1.5, -1.4)
      sign(g, 'PROENZA', 'ABOGADOS', 0, 2.0, -1.31, 3.0, 0.95)
      framedPic(g, -1.4, 1.15, -1.31, 0, 0.5, 0.4)
      framedPic(g, 1.4, 1.15, -1.31, 0, 0.5, 0.4)
      clock(g, 0, 1.2, -1.31)
      // sala de espera
      box(g, 1.8, 0.5, 0.7, P.navy, -1.7, 0.45, 1.7) // sofá asiento
      box(g, 1.8, 0.5, 0.2, P.navy, -1.7, 0.75, 1.95) // respaldo
      box(g, 0.8, 0.4, 0.8, P.wood, 0, 0.3, 1.9) // mesa de centro
      plant(g, 2.2, 1.9, 1.0)
    },
    areas(g) {
      rug(g, 4.6, 3.2)
      // muro de especialidades
      box(g, 5.0, 0.3, 0.6, P.cream, 0, 0.15, -1.2)
      box(g, 5.0, 2.2, 0.2, P.cream, 0, 1.3, -1.4)
      const cols = [0x2e6fb7, 0x1b4d89, 0xc29a4b, 0x3f7d54, 0x9aa0a8, 0xb04a3a, 0x7a5aa0]
      for (let i = 0; i < 7; i++) framedPic(g, -2.0 + i * 0.66, 1.5, -1.28, 0, 0.5, 0.62, cols[i])
      // bancas para consultar
      box(g, 3.2, 0.4, 0.5, P.wood, 0, 0.4, 0.6)
      plant(g, 2.5, 0.0, 1.0)
      plant(g, -2.5, 0.0, 1.0)
    },
    abogados(g) {
      rug(g, 5.0, 4.0)
      deskWithChair(g, -1.4, -0.6, 0)
      deskWithChair(g, 1.4, -0.6, 0)
      deskWithChair(g, 0, 1.4, Math.PI)
      // divisores de vidrio
      box(g, 0.06, 1.0, 1.8, P.glass, 0, 0.7, -0.6)
      plant(g, 2.4, 1.6, 1.0)
    },
    blog(g) {
      rug(g, 4.6, 4.0)
      bookshelf(g, -1.6, -1.0, 0.2)
      bookshelf(g, 0, -1.2, 0)
      bookshelf(g, 1.6, -1.0, -0.2)
      // rincón de lectura
      box(g, 1.4, 0.4, 0.9, P.wood, 0.4, 0.35, 1.4) // mesa
      books(g, 0.4, 0.6, 1.4, 5)
      // sillón
      box(g, 0.9, 0.4, 0.9, P.leather, -1.5, 0.35, 1.3)
      box(g, 0.9, 0.6, 0.2, P.leather, -1.5, 0.6, 0.95)
      floorLamp(g, -2.4, 1.6)
    },
    agendar(g) {
      rug(g, 5.0, 5.0)
      // mesa de juntas redonda
      cyl(g, 1.5, 1.5, 0.16, P.wood, 0, 0.78, 0, 28)
      cyl(g, 0.4, 0.5, 0.7, P.woodDark, 0, 0.38, 0, 12)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        chair(g, Math.cos(a) * 2.0, Math.sin(a) * 2.0, -a + Math.PI / 2)
      }
      // lámpara colgante (brilla con bloom)
      cyl(g, 0.03, 0.03, 1.2, P.woodDark, 0, 2.6, 0, 6)
      const pend = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), P.warm)
      pend.position.y = 2.0
      g.add(pend)
      cyl(g, 0.34, 0.16, 0.3, P.gold, 0, 2.1, 0, 16)
      plant(g, 2.6, 2.0, 1.0)
    },
    caso(g) {
      rug(g, 4.0, 3.4)
      // escritorio de admisión
      box(g, 2.4, 1.0, 0.9, P.navy, 0, 0.5, -0.4)
      box(g, 2.6, 0.14, 1.1, P.wood, 0, 1.05, -0.4)
      box(g, 0.6, 0.3, 0.4, P.paper, 0.6, 1.2, -0.4) // bandeja de entrada
      box(g, 0.5, 0.36, 0.36, P.paper, -0.6, 1.2, -0.4) // carpetas
      bankerLamp(g, 0, 1.1, -0.6)
      chair(g, 0, 0.6, 0)
      framedPic(g, 0, 1.7, -1.0, 0, 1.0, 0.5)
      box(g, 2.6, 1.6, 0.16, P.cream, 0, 1.4, -1.1)
      plant(g, 1.9, 0.6, 1.0)
    },
    contacto(g) {
      rug(g, 3.6, 3.0)
      // panel de contacto
      box(g, 2.6, 1.8, 0.18, P.cream, 0, 1.1, -0.6)
      framedPic(g, -0.7, 1.3, -0.5, 0, 0.7, 0.5, 0x2e6fb7)
      framedPic(g, 0.7, 1.3, -0.5, 0, 0.7, 0.5, 0xc29a4b)
      box(g, 2.0, 0.4, 0.5, P.wood, 0, 0.4, 0.5)
      floorLamp(g, 1.7, 0.3)
      plant(g, -1.7, 0.4, 0.9)
    },
  }

  // --- instanciar zonas ------------------------------------------------------
  const stations = STATION_DEFS.map((def) => {
    const dir = dirV(def.dir)
    const g = new THREE.Group()
    placeOnSurface(g, dir)
    builders[def.id](g)

    const col = new THREE.Color(def.color)
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 1),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.35, flatShading: true })
    )
    orb.position.y = 3.6
    orb.castShadow = true
    g.add(orb)
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.62, 28),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    )
    halo.position.y = 3.6
    g.add(halo)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.06, 10, 44),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35 })
    )
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.06
    g.add(ring)

    group.add(g)
    return { ...def, group: g, orb, halo, ring, worldPos: pointOnSurface(dir).clone(), anchor: pointOnSurface(dir, 4.3).clone() }
  })

  // --- pasillos (alfombras corridas) entre el recibidor y cada zona ---------
  // Cada segmento se orienta a lo largo del camino y se solapa con el siguiente
  // para formar un corredor continuo, sin huecos.
  for (const s of stations) {
    const a = plazaDir.clone()
    const b = dirV(s.dir)
    const steps = 18
    for (let i = 1; i < steps; i++) {
      const d = slerpDir(a, b, i / steps)
      const dPrev = slerpDir(a, b, (i - 0.6) / steps)
      const dNext = slerpDir(a, b, (i + 0.6) / steps)
      const up = d.clone().normalize()
      const fwd = dNext.clone().sub(dPrev)
      fwd.sub(up.clone().multiplyScalar(fwd.dot(up)))
      if (fwd.lengthSq() < 1e-6) continue
      fwd.normalize()
      const right = new THREE.Vector3().crossVectors(up, fwd).normalize()
      const tile = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 1.9), P.runner)
      tile.position.copy(pointOnSurface(d, 0.02))
      tile.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, fwd))
      tile.receiveShadow = true
      group.add(tile)
    }
  }

  // --- decoración suelta (plantas y lámparas de pie) ------------------------
  decorate(THREE, group, P, pointOnSurface, orientTo, stations, plazaDir)

  return { group, stations, radius: RADIUS, pointOnSurface }
}

function decorate(THREE, group, P, pointOnSurface, orientTo, stations, plazaDir) {
  const rng = mulberry32(2024)
  const nearAnything = (dir) =>
    plazaDir.angleTo(dir) < 0.36 || stations.some((s) => s.worldPos.clone().normalize().angleTo(dir) < 0.34)

  let placed = 0
  let tries = 0
  while (placed < 30 && tries < 300) {
    tries++
    const dir = randomUnitVector(THREE, rng)
    if (nearAnything(dir)) continue
    placed++
    const item = new THREE.Group()
    item.position.copy(pointOnSurface(dir))
    orientTo(item, dir)
    if (rng() < 0.6) {
      // planta
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.4, 12), P.woodDark)
      pot.position.y = 0.2
      pot.castShadow = true
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 + rng() * 0.2, 1), rng() > 0.5 ? P.leaf : P.leaf2)
      f.position.y = 0.7
      f.scale.y = 1.3
      f.castShadow = true
      item.add(pot, f)
    } else {
      // lámpara de pie cálida
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.5, 6), P.gold)
      pole.position.y = 0.8
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), P.warm)
      bulb.position.y = 1.6
      item.add(pole, bulb)
    }
    group.add(item)
  }
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomUnitVector(THREE, rng) {
  const u = rng() * 2 - 1
  const theta = rng() * Math.PI * 2
  const r = Math.sqrt(1 - u * u)
  return new THREE.Vector3(r * Math.cos(theta), u, r * Math.sin(theta))
}
