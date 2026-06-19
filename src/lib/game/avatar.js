// El personaje del visitante: un abogado estilizado con un sutil contorno tipo
// ilustración (toon) para que combine con el estilo pintado a mano. Recibe THREE.
export function createAvatar(THREE, color = 0x294e86) {
  const group = new THREE.Group()

  const suit = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.04 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b2740, roughness: 0.7 })
  const skin = new THREE.MeshStandardMaterial({ color: 0xeccaa6, roughness: 0.85 })
  const hair = new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.95 })
  const tie = new THREE.MeshStandardMaterial({ color: 0xc7a14e, roughness: 0.5, metalness: 0.15 })
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a2336, side: THREE.BackSide })

  // Contorno tipo ilustración: copia trasera ligeramente mayor de cada pieza.
  const withOutline = (mesh, s = 1.09) => {
    const o = new THREE.Mesh(mesh.geometry, outlineMat)
    o.scale.setScalar(s)
    mesh.add(o)
    return mesh
  }
  const part = (geo, m, x, y, z, outline = true, s = 1.09) => {
    const mesh = new THREE.Mesh(geo, m)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    if (outline) withOutline(mesh, s)
    return mesh
  }

  // Torso (saco), corbata, cuello, cabeza, pelo.
  group.add(part(new THREE.CylinderGeometry(0.26, 0.34, 0.7, 16), suit, 0, 0.7, 0))
  const tieMesh = part(new THREE.BoxGeometry(0.07, 0.34, 0.04), tie, 0, 0.74, 0.27, false)
  group.add(tieMesh)
  group.add(part(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 8), skin, 0, 1.08, 0, false))
  group.add(part(new THREE.SphereGeometry(0.24, 20, 20), skin, 0, 1.32, 0, true, 1.06))
  group.add(part(new THREE.SphereGeometry(0.255, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), hair, 0, 1.34, 0, false))
  group.add(part(new THREE.ConeGeometry(0.05, 0.12, 8), skin, 0, 1.32, 0.24, false)) // nariz

  // Brazos (pivotan desde el hombro).
  const armGeo = new THREE.CapsuleGeometry(0.085, 0.42, 4, 8)
  const mkArm = (side) => {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.34, 0.95, 0)
    pivot.add(part(armGeo, suit, 0, -0.26, 0))
    pivot.add(part(new THREE.SphereGeometry(0.09, 10, 10), skin, 0, -0.52, 0, false))
    group.add(pivot)
    return pivot
  }
  const armL = mkArm(-1)
  const armR = mkArm(1)

  // Maletín.
  group.add(part(new THREE.BoxGeometry(0.26, 0.22, 0.1), dark, 0.34, 0.42, 0.02))

  // Piernas (pivotan desde la cadera).
  const legGeo = new THREE.CapsuleGeometry(0.11, 0.34, 4, 8)
  const mkLeg = (side) => {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.13, 0.36, 0)
    pivot.add(part(legGeo, dark, 0, -0.22, 0))
    pivot.add(part(new THREE.BoxGeometry(0.16, 0.1, 0.28), dark, 0, -0.44, 0.05, false))
    group.add(pivot)
    return pivot
  }
  const legL = mkLeg(-1)
  const legR = mkLeg(1)

  group.userData.legs = [legL, legR]
  group.userData.arms = [armL, armR]
  group.userData.torso = group.children[0]
  return group
}
