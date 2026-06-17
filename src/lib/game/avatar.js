// El personaje del visitante: un abogado/mensajero estilizado, con brazos y
// piernas que se animan al caminar (y un leve "respirar" en reposo).
// Recibe THREE porque la librería se carga de forma diferida.
export function createAvatar(THREE, color = 0x2e6fb7) {
  const group = new THREE.Group()

  const suit = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x16203a, roughness: 0.7 })
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8c9a8, roughness: 0.8 })
  const hair = new THREE.MeshStandardMaterial({ color: 0x33281f, roughness: 0.9 })
  const tie = new THREE.MeshStandardMaterial({ color: 0xc29a4b, roughness: 0.5, metalness: 0.1 })

  // Torso (cónico para sugerir hombros + saco).
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.7, 16), suit)
  torso.position.y = 0.7
  torso.castShadow = true
  group.add(torso)

  // Corbata.
  const tieMesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.04), tie)
  tieMesh.position.set(0, 0.74, 0.27)
  group.add(tieMesh)

  // Cuello + cabeza.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 8), skin)
  neck.position.y = 1.08
  group.add(neck)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 20), skin)
  head.position.y = 1.32
  head.castShadow = true
  group.add(head)
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.255, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), hair)
  hairMesh.position.y = 1.34
  group.add(hairMesh)

  // Brazos (pivotan desde el hombro).
  const armGeo = new THREE.CapsuleGeometry(0.085, 0.42, 4, 8)
  const mkArm = (side) => {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.34, 0.95, 0)
    const arm = new THREE.Mesh(armGeo, suit)
    arm.position.y = -0.26
    arm.castShadow = true
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), skin)
    hand.position.y = -0.52
    pivot.add(arm, hand)
    group.add(pivot)
    return pivot
  }
  const armL = mkArm(-1)
  const armR = mkArm(1)

  // Maletín en la mano derecha.
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.1), dark)
  bag.position.set(0.34, 0.42, 0.02)
  bag.castShadow = true
  group.add(bag)

  // Piernas (pivotan desde la cadera).
  const legGeo = new THREE.CapsuleGeometry(0.11, 0.34, 4, 8)
  const mkLeg = (side) => {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.13, 0.36, 0)
    const leg = new THREE.Mesh(legGeo, dark)
    leg.position.y = -0.22
    leg.castShadow = true
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), dark)
    shoe.position.set(0, -0.44, 0.05)
    pivot.add(leg, shoe)
    group.add(pivot)
    return pivot
  }
  const legL = mkLeg(-1)
  const legR = mkLeg(1)

  // Orientación: mira hacia +Z (la nariz da la pista de hacia dónde camina).
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), skin)
  nose.rotation.x = Math.PI / 2
  nose.position.set(0, 1.32, 0.24)
  group.add(nose)

  group.userData.legs = [legL, legR]
  group.userData.arms = [armL, armR]
  group.userData.torso = torso
  group.userData.head = head
  return group
}
