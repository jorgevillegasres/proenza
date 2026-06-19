// El equipo de Proenza Abogados. Cada uno tiene su oficina en el despacho 3D.
export const abogados = [
  {
    slug: 'harold-tabares',
    name: 'Dr. Harold Tabares',
    role: 'Abogado Civilista',
    specialty: 'Derecho Civil',
    photo: '',
    bio: 'Especialista en derecho civil: contratos, obligaciones, bienes y responsabilidad civil. Acompaña a sus clientes con rigor y cercanía.',
    areas: ['contratos', 'obligaciones', 'bienes'],
    email: 'htabares@proenzalegal.com',
  },
  {
    slug: 'edna-ramirez',
    name: 'Dra. Edna Ramírez',
    role: 'Abogada Civilista',
    specialty: 'Derecho Civil',
    photo: '',
    bio: 'Abogada civilista enfocada en familia, sucesiones y litigio civil. Defiende lo que más importa a las familias con firmeza y empatía.',
    areas: ['familia', 'sucesiones', 'responsabilidad-civil'],
    email: 'eramirez@proenzalegal.com',
  },
  {
    slug: 'ivan-salazar',
    name: 'Dr. Iván Salazar',
    role: 'Abogado Tributarista',
    specialty: 'Derecho Tributario',
    photo: '',
    bio: 'Especialista en derecho tributario: planeación fiscal, cumplimiento y defensa ante la administración tributaria.',
    areas: ['contratos', 'obligaciones'],
    email: 'isalazar@proenzalegal.com',
  },
  {
    slug: 'jorge-villegas',
    name: 'Dr. Jorge Alberto Villegas',
    role: 'Abogado Informático',
    specialty: 'Derecho Informático',
    photo: '',
    bio: 'Abogado informático: protección de datos, contratos tecnológicos, ciberseguridad y derecho digital. Une el derecho con la tecnología.',
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
