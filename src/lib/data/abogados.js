// El equipo de Proenza Abogados. Cada uno tiene su oficina en el despacho 3D.
// NOTA: fotos de PRUEBA (placeholders generados) — reemplazar por las reales del equipo.
import photoHarold from '$lib/assets/demo/team/lawyer-m1.webp'
import photoEdna from '$lib/assets/demo/team/lawyer-f1.webp'
import photoIvan from '$lib/assets/demo/team/lawyer-m2.webp'
import photoJorge from '$lib/assets/demo/team/lawyer-m3.webp'

export const abogados = [
  {
    slug: 'harold-tabares',
    name: 'Dr. Harold Tabares',
    role: 'Abogado Civilista',
    specialty: 'Derecho Civil',
    photo: photoHarold,
    bio: 'Especialista en derecho civil: contratos, obligaciones, bienes y responsabilidad civil. Acompaña a sus clientes con rigor y cercanía.',
    bio_en: 'Civil law specialist: contracts, obligations, property and civil liability. Guides his clients with rigor and a close, personal approach.',
    areas: ['contratos', 'obligaciones', 'bienes'],
    email: 'htabares@proenzalegal.com',
  },
  {
    slug: 'edna-ramirez',
    name: 'Dra. Edna Ramírez',
    role: 'Abogada Civilista',
    specialty: 'Derecho Civil',
    photo: photoEdna,
    bio: 'Abogada civilista enfocada en familia, sucesiones y litigio civil. Defiende lo que más importa a las familias con firmeza y empatía.',
    bio_en: 'Civil lawyer focused on family law, estates and civil litigation. Defends what matters most to families with firmness and empathy.',
    areas: ['familia', 'sucesiones', 'responsabilidad-civil'],
    email: 'eramirez@proenzalegal.com',
  },
  {
    slug: 'ivan-salazar',
    name: 'Dr. Iván Salazar',
    role: 'Abogado Tributarista',
    specialty: 'Derecho Tributario',
    photo: photoIvan,
    bio: 'Especialista en derecho tributario: planeación fiscal, cumplimiento y defensa ante la administración tributaria.',
    bio_en: 'Tax law specialist: fiscal planning, compliance and defense before the tax authorities.',
    areas: ['contratos', 'obligaciones'],
    email: 'isalazar@proenzalegal.com',
  },
  {
    slug: 'jorge-villegas',
    name: 'Dr. Jorge Alberto Villegas',
    role: 'Abogado Informático',
    specialty: 'Derecho Informático',
    photo: photoJorge,
    bio: 'Abogado informático: protección de datos, contratos tecnológicos, ciberseguridad y derecho digital. Une el derecho con la tecnología.',
    bio_en: 'IT lawyer: data protection, technology contracts, cybersecurity and digital law. Bridges law and technology.',
    areas: ['contratos', 'personas'],
    email: 'jvillegas@proenzalegal.com',
  },
]

export function getAbogado(slug) {
  return abogados.find((a) => a.slug === slug)
}

// Iniciales para el monograma cuando no hay foto.
export function initials(name) {
  return name
    .replace(/^(Dr|Dra)\.?\s*/i, '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}
