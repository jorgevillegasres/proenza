// Perfiles del equipo. Contenido de ejemplo (placeholder) — reemplazar por los
// abogados reales, sus fotos y trayectoria. El campo `posts` enlaza con el blog.
export const abogados = [
  {
    slug: 'maria-proenza',
    name: 'María Proenza',
    role: 'Socia fundadora · Familia y Sucesiones',
    photo: '', // ruta a foto real; si vacío se usa un monograma
    bio: 'Abogada de la Universidad Nacional de Colombia con más de 15 años acompañando a familias en procesos de divorcio, custodia y sucesiones. Cree en una litigación firme pero humana.',
    areas: ['familia', 'sucesiones'],
    email: 'mproenza@proenzabogados.co',
  },
  {
    slug: 'carlos-restrepo',
    name: 'Carlos Restrepo',
    role: 'Socio · Contratos y Responsabilidad Civil',
    photo: '',
    bio: 'Especialista en derecho contractual y responsabilidad civil. Estructura negocios y defiende a sus clientes cuando un acuerdo se incumple o un daño debe repararse.',
    areas: ['contratos', 'responsabilidad-civil', 'obligaciones'],
    email: 'crestrepo@proenzabogados.co',
  },
  {
    slug: 'laura-gomez',
    name: 'Laura Gómez',
    role: 'Asociada · Bienes y Derecho de Personas',
    photo: '',
    bio: 'Enfocada en derecho inmobiliario y procesos de pertenencia. Acompaña a propietarios a sanear y proteger su patrimonio con rigor y cercanía.',
    areas: ['bienes', 'personas'],
    email: 'lgomez@proenzabogados.co',
  },
]

export function getAbogado(slug) {
  return abogados.find((a) => a.slug === slug)
}

// Iniciales para el monograma cuando no hay foto.
export function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}
