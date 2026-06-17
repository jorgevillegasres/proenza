// Construye el planeta-despacho: superficie, atmósfera, caminos, monumento y las
// "estaciones" (recepción, áreas, abogados, biblioteca, agenda, caso, contacto).
// Recibe THREE (carga diferida).

export const RADIUS = 16

const STATION_DEFS = [
  { id: 'recepcion', label: 'Recepción', color: '#c29a4b', dir: [0.34, 0.26, 0.92] },
  { id: 'areas', label: 'Áreas de práctica', color: '#2e6fb7', dir: [0.95, 0.12, 0.15] },
  { id: 'abogados', label: 'Nuestros abogados', color: '#1b4d89', dir: [0.5, 0.08, -0.92] },
  { id: 'blog', label: 'Biblioteca', color: '#3a86b5', dir: [-0.62, 0.18, -0.82] },
  { id: 'agendar', label: 'Agenda tu cita', color: '#c29a4b', dir: [-0.95, 0.12, 0.18], cta: true },
  { id: 'caso', label: 'Cuéntanos tu caso', color: '#2e6fb7', dir: [-0.18, 0.95, 0.05] },
  { id: 'contacto', label: 'Contacto', color: '#1b4d89', dir: [0.22, -0.9, 0.3] },
]

export function buildWorld(THREE, options = {}) {
  const group = new THREE.Group()
  const mat = (color, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.03, ...opts })

  const P = {
    grass: mat(0x57a36a, { flatShading: true }),
    grass2: mat(0x4a8f5d, { flatShading: true }),
    ocean: mat(0x2b6b8c),
    plaza: mat(0xede3cf),
    plazaDark: mat(0xd9cdb2),
    navy: mat(0x183f6b),
    blue: mat(0x2e6fb7),
    cream: mat(0xf2e9d6),
    wood: mat(0xb98a52),
    woodDark: mat(0x6f4a2b),
    white: mat(0xf6f3ec),
    leaf: mat(0x3f7d54, { flatShading: true }),
    leaf2: mat(0x356b48, { flatShading: true }),
    stone: mat(0x9aa0a8, { flatShading: true }),
    stoneLight: mat(0xb9bec5, { flatShading: true }),
    gold: mat(0xc29a4b, { emissive: 0x6b5200, emissiveIntensity: 0.3, metalness: 0.2, roughness: 0.5 }),
    glass: mat(0x8fb8e0, { roughness: 0.25, metalness: 0.15 }),
  }

  // Textura del césped pintada a mano (Higgsfield) — "viste" la geometría sin
  // sacrificar rendimiento. Si no se provee, queda el color plano de antes.
  if (options.grassUrl) {
    const tex = new THREE.TextureLoader().load(options.grassUrl)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(7, 7)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    for (const [m, tint] of [
      [P.grass, 0xffffff],
      [P.grass2, 0xdfe6da],
    ]) {
      m.map = tex
      m.color.set(tint)
      m.flatShading = false
      m.needsUpdate = true
    }
  }

  // --- superficie ------------------------------------------------------------
  const surface = new THREE.Mesh(new THREE.IcosahedronGeometry(RADIUS, 16), P.grass)
  surface.receiveShadow = true
  surface.castShadow = true
  group.add(surface)

  const core = new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 0.99, 48, 48), P.ocean)
  group.add(core)

  // Halo atmosférico (fresnel) — el sello del look "planeta diminuto".
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS * 1.16, 48, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { glowColor: { value: new THREE.Color(0x6fa8e8) }, power: { value: 3.2 } },
      vertexShader: `varying vec3 vN; varying vec3 vP;
        void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz;
        gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vP; uniform vec3 glowColor; uniform float power;
        void main(){ vec3 v=normalize(-vP); float f=pow(1.0-max(dot(vN,v),0.0),power); gl_FragColor=vec4(glowColor,f); }`,
    })
  )
  group.add(atmosphere)

  const dirV = (d) => new THREE.Vector3(...d).normalize()
  const pointOnSurface = (dir, h = 0) => dir.clone().normalize().multiplyScalar(RADIUS + h)
  const orientTo = (obj, dir) =>
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())

  // --- helpers ---------------------------------------------------------------
  const box = (parent, w, h, d, m, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
    mesh.position.set(x, y, z)
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
  const placeOnSurface = (obj, dir, h = 0) => {
    obj.position.copy(pointOnSurface(dir, h))
    orientTo(obj, dir)
  }
  // Interpolación esférica entre dos direcciones unitarias.
  const slerpDir = (a, b, t) => {
    let dot = Math.max(-1, Math.min(1, a.dot(b)))
    const th = Math.acos(dot)
    if (th < 1e-4) return a.clone()
    const s = Math.sin(th)
    return a
      .clone()
      .multiplyScalar(Math.sin((1 - t) * th) / s)
      .add(b.clone().multiplyScalar(Math.sin(t * th) / s))
      .normalize()
  }

  // --- plaza central + monumento --------------------------------------------
  const plazaDir = dirV([0, 0.32, 1])
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.1, 0.2, 48), P.plaza)
  placeOnSurface(plaza, plazaDir, 0.04)
  plaza.receiveShadow = true
  group.add(plaza)
  const plazaInner = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.06, 40), P.plazaDark)
  placeOnSurface(plazaInner, plazaDir, 0.16)
  group.add(plazaInner)

  // Monumento: pedestal de piedra + esfera dorada (emblema del despacho).
  const mon = new THREE.Group()
  placeOnSurface(mon, plazaDir, 0.16)
  cyl(mon, 0.55, 0.75, 0.7, P.stoneLight, 0, 0.35, 0, 24)
  cyl(mon, 0.4, 0.5, 1.3, P.white, 0, 1.2, 0, 20)
  const emblem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), P.gold)
  emblem.position.y = 2.2
  emblem.castShadow = true
  mon.add(emblem)
  group.add(mon)

  // --- estaciones ------------------------------------------------------------
  const builders = {
    recepcion(g) {
      box(g, 3.4, 0.3, 1.8, P.stoneLight, 0, 0.15, 0)
      box(g, 2.8, 1.0, 1.1, P.navy, 0, 0.7, 0.1)
      box(g, 3.0, 0.16, 1.3, P.wood, 0, 1.25, 0.1)
      cyl(g, 0.11, 0.11, 2.0, P.cream, -1.25, 1.0, -0.7)
      cyl(g, 0.11, 0.11, 2.0, P.cream, 1.25, 1.0, -0.7)
      box(g, 3.0, 0.5, 0.2, P.blue, 0, 2.1, -0.7)
      box(g, 2.4, 0.28, 0.06, P.gold, 0, 2.1, -0.58)
    },
    areas(g) {
      box(g, 4.6, 0.35, 1.9, P.stoneLight, 0, 0.17, 0)
      box(g, 4.2, 0.25, 1.6, P.white, 0, 0.42, 0)
      for (const x of [-1.6, -0.55, 0.55, 1.6]) {
        cyl(g, 0.2, 0.24, 2.3, P.white, x, 1.6, 0, 16)
        cyl(g, 0.28, 0.28, 0.16, P.white, x, 2.78, 0, 16)
      }
      box(g, 4.4, 0.32, 1.3, P.white, 0, 2.95, 0)
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 2.4, 1.0, 3), P.cream)
      ped.position.set(0, 3.6, 0)
      ped.rotation.y = Math.PI / 4
      ped.castShadow = true
      g.add(ped)
    },
    abogados(g) {
      box(g, 3.4, 0.3, 2.4, P.stoneLight, 0, 0.15, 0)
      for (const x of [-1, 0, 1]) {
        box(g, 0.8, 0.5, 0.55, P.wood, x, 0.55, 0.45)
        box(g, 0.7, 0.04, 0.45, P.woodDark, x, 0.82, 0.45)
        cyl(g, 0.2, 0.26, 0.75, P.blue, x, 0.9, -0.2, 12)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), P.cream)
        head.position.set(x, 1.4, -0.2)
        head.castShadow = true
        g.add(head)
      }
      box(g, 3.6, 1.4, 0.2, P.navy, 0, 1.0, -1.0)
      box(g, 3.0, 0.9, 0.05, P.glass, 0, 1.1, -0.88)
    },
    blog(g) {
      box(g, 3.0, 0.3, 1.6, P.stoneLight, 0, 0.15, 0)
      box(g, 2.8, 2.5, 0.9, P.woodDark, 0, 1.45, 0)
      for (let i = 0; i < 4; i++) box(g, 2.6, 0.1, 0.8, P.wood, 0, 0.55 + i * 0.62, 0.06)
      const colors = [0x2e6fb7, 0x183f6b, 0xc29a4b, 0x3f7d54, 0x9aa0a8, 0xb04a3a]
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 7; j++) {
          const c = colors[(i * 3 + j) % colors.length]
          const b = box(g, 0.16, 0.42 + ((j * 7) % 5) * 0.03, 0.14, mat(c), -1.05 + j * 0.32, 0.78 + i * 0.62, 0.42)
          void b
        }
      // tejado a dos aguas
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 1.7, 0.9, 3), P.navy)
      roof.position.set(0, 3.1, 0)
      roof.rotation.y = Math.PI / 2
      roof.castShadow = true
      g.add(roof)
    },
    agendar(g) {
      box(g, 2.0, 0.3, 1.4, P.stoneLight, 0, 0.15, 0)
      box(g, 1.6, 1.8, 1.0, P.cream, 0, 1.05, 0)
      box(g, 2.0, 0.4, 1.3, P.gold, 0, 2.05, 0)
      const clock = cyl(g, 0.45, 0.45, 0.12, P.white, 0, 1.25, 0.56, 22)
      clock.rotation.x = Math.PI / 2
      box(g, 0.05, 0.3, 0.03, P.navy, 0, 1.38, 0.63)
      box(g, 0.24, 0.05, 0.03, P.navy, 0.1, 1.25, 0.63)
    },
    caso(g) {
      box(g, 1.8, 0.3, 1.4, P.stoneLight, 0, 0.15, 0)
      cyl(g, 0.13, 0.16, 1.5, P.woodDark, 0, 0.85, 0, 10)
      box(g, 1.0, 0.75, 0.66, P.blue, 0, 1.75, 0)
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.0, 18, 1, false, 0, Math.PI), P.blue)
      lid.rotation.z = Math.PI / 2
      lid.position.set(0, 2.12, 0)
      lid.castShadow = true
      g.add(lid)
      box(g, 0.5, 0.06, 0.1, P.gold, 0, 1.75, 0.34) // ranura
    },
    contacto(g) {
      box(g, 1.6, 0.3, 1.4, P.stoneLight, 0, 0.15, 0)
      cyl(g, 0.11, 0.13, 2.4, P.woodDark, 0, 1.2, 0, 10)
      box(g, 1.7, 0.42, 0.12, P.blue, 0.55, 2.0, 0)
      box(g, 1.4, 0.38, 0.12, P.navy, -0.45, 1.45, 0)
      box(g, 1.1, 0.34, 0.12, P.gold, 0.35, 0.95, 0)
    },
  }

  const stations = STATION_DEFS.map((def) => {
    const dir = dirV(def.dir)
    const g = new THREE.Group()
    placeOnSurface(g, dir)
    builders[def.id](g)

    const col = new THREE.Color(def.color)
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42, 1),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, roughness: 0.35, flatShading: true })
    )
    orb.position.y = 3.9
    orb.castShadow = true
    g.add(orb)

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 28),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    )
    halo.position.y = 3.9
    g.add(halo)

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.07, 10, 44),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35 })
    )
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.08
    g.add(ring)

    group.add(g)
    return {
      ...def,
      group: g,
      orb,
      halo,
      ring,
      worldPos: pointOnSurface(dir).clone(),
      anchor: pointOnSurface(dir, 4.6).clone(),
    }
  })

  // --- caminos de la plaza a cada estación ----------------------------------
  for (const s of stations) {
    const a = plazaDir.clone()
    const b = dirV(s.dir)
    const steps = 14
    for (let i = 1; i < steps; i++) {
      const t = i / steps
      const d = slerpDir(a, b, t)
      const tile = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.1), i % 2 ? P.plaza : P.plazaDark)
      placeOnSurface(tile, d, 0.02)
      tile.receiveShadow = true
      group.add(tile)
    }
  }

  // --- decorados -------------------------------------------------------------
  scatter(THREE, group, P, pointOnSurface, orientTo, stations, slerpDir, plazaDir)

  return { group, stations, radius: RADIUS, pointOnSurface, atmosphere }
}

function scatter(THREE, group, P, pointOnSurface, orientTo, stations, slerpDir, plazaDir) {
  const rng = mulberry32(2024)
  const nearAnything = (dir) => {
    if (plazaDir.angleTo(dir) < 0.34) return true
    return stations.some((s) => s.worldPos.clone().normalize().angleTo(dir) < 0.3)
  }

  let placed = 0
  let tries = 0
  while (placed < 80 && tries < 500) {
    tries++
    const dir = randomUnitVector(THREE, rng)
    if (nearAnything(dir)) continue
    placed++
    const item = new THREE.Group()
    item.position.copy(pointOnSurface(dir))
    orientTo(item, dir)

    const k = rng()
    if (k < 0.55) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.75, 6), P.woodDark)
      trunk.position.y = 0.37
      trunk.castShadow = true
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.0, 8), rng() > 0.5 ? P.leaf : P.leaf2)
      c1.position.y = 1.1
      c1.castShadow = true
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.85, 8), P.leaf2)
      c2.position.y = 1.6
      c2.castShadow = true
      item.scale.setScalar(0.7 + rng() * 0.9)
      item.add(trunk, c1, c2)
    } else if (k < 0.72) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + rng() * 0.4), P.stone)
      rock.position.y = 0.2
      rock.rotation.set(rng() * 6, rng() * 6, rng() * 6)
      rock.castShadow = true
      item.add(rock)
    } else if (k < 0.86) {
      // arbusto
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + rng() * 0.2, 1), P.leaf)
      bush.position.y = 0.3
      bush.scale.y = 0.7
      bush.castShadow = true
      item.add(bush)
    } else {
      // farola (con luz que florece con el bloom)
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.6, 6), P.stone)
      pole.position.y = 0.8
      pole.castShadow = true
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd982, emissiveIntensity: 1.4 })
      )
      lamp.position.y = 1.7
      item.add(pole, lamp)
    }
    group.add(item)
  }

  // pequeñas colinas para romper la silueta
  const rng2 = mulberry32(77)
  for (let i = 0; i < 26; i++) {
    const dir = randomUnitVector(THREE, rng2)
    if (plazaDir.angleTo(dir) < 0.3) continue
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.8 + rng2() * 1.6, 10, 8), rng2() > 0.5 ? P.grass : P.grass2)
    mound.position.copy(pointOnSurface(dir, -0.2))
    mound.scale.y = 0.4
    orientTo(mound, dir)
    mound.receiveShadow = true
    mound.castShadow = true
    group.add(mound)
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
