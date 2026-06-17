// Áreas de práctica (derecho civil colombiano). Cada una genera su propia
// página indexable en /areas/[slug]. Contenido de ejemplo — ajustar con textos
// reales del despacho.
export const areas = [
  {
    slug: 'familia',
    name: 'Derecho de Familia',
    icon: 'family',
    summary: 'Matrimonio, divorcio, alimentos, custodia y unión marital de hecho.',
    intro:
      'Acompañamos a las familias en los momentos que más exigen claridad y respeto: separaciones, custodia de los hijos, cuotas de alimentos y reconocimiento de la unión marital de hecho.',
    services: [
      'Divorcio y cesación de efectos civiles del matrimonio',
      'Custodia, cuidado personal y régimen de visitas',
      'Fijación, aumento o exoneración de cuota alimentaria',
      'Unión marital de hecho y sociedad patrimonial',
      'Capitulaciones y régimen de bienes',
    ],
  },
  {
    slug: 'sucesiones',
    name: 'Sucesiones y Herencias',
    icon: 'inheritance',
    summary: 'Reparto de herencias, testamentos y sucesiones intestadas.',
    intro:
      'Gestionamos la transmisión del patrimonio con orden y transparencia, dentro y fuera de juzgado, para que el legado de una persona llegue a quienes corresponde sin conflictos innecesarios.',
    services: [
      'Sucesión testada e intestada (notarial o judicial)',
      'Elaboración e impugnación de testamentos',
      'Partición y adjudicación de bienes',
      'Cesión de derechos herenciales',
    ],
  },
  {
    slug: 'contratos',
    name: 'Contratos Civiles',
    icon: 'contract',
    summary: 'Redacción, revisión y cumplimiento de contratos civiles.',
    intro:
      'Un buen contrato previene un mal pleito. Redactamos, revisamos y negociamos acuerdos sólidos, y representamos a nuestros clientes cuando una de las partes incumple.',
    services: [
      'Redacción y revisión de contratos',
      'Compraventa, arrendamiento, mutuo y mandato',
      'Incumplimiento contractual y cláusula penal',
      'Resolución y nulidad de contratos',
    ],
  },
  {
    slug: 'bienes',
    name: 'Bienes y Derechos Reales',
    icon: 'property',
    summary: 'Propiedad, posesión, servidumbres y pertenencia.',
    intro:
      'Protegemos lo que es tuyo: titularidad de inmuebles, defensa de la posesión, linderos, servidumbres y procesos de pertenencia para sanear la propiedad.',
    services: [
      'Procesos de pertenencia (prescripción adquisitiva)',
      'Deslinde y amojonamiento',
      'Servidumbres y propiedad horizontal',
      'Acciones posesorias y reivindicatorias',
    ],
  },
  {
    slug: 'obligaciones',
    name: 'Obligaciones',
    icon: 'obligation',
    summary: 'Cobro de deudas, responsabilidad y cumplimiento.',
    intro:
      'Estructuramos y exigimos el cumplimiento de las obligaciones: cobros de cartera, títulos valores, intereses y procesos ejecutivos para recuperar lo adeudado.',
    services: [
      'Cobro pre-jurídico y jurídico de deudas',
      'Procesos ejecutivos (títulos valores)',
      'Constitución en mora e intereses',
      'Novación, dación en pago y compensación',
    ],
  },
  {
    slug: 'responsabilidad-civil',
    name: 'Responsabilidad Civil',
    icon: 'liability',
    summary: 'Reparación de daños y perjuicios contractuales y extracontractuales.',
    intro:
      'Cuando un daño altera tu vida o tu patrimonio, buscamos la reparación justa: indemnización de perjuicios materiales y morales por responsabilidad contractual o extracontractual.',
    services: [
      'Daños por accidentes y hechos de terceros',
      'Perjuicios materiales y morales',
      'Responsabilidad contractual y extracontractual',
      'Reclamaciones a aseguradoras',
    ],
  },
  {
    slug: 'personas',
    name: 'Derecho de Personas',
    icon: 'person',
    summary: 'Estado civil, capacidad, nombre y representación.',
    intro:
      'Acompañamos los asuntos que definen la identidad jurídica de una persona: correcciones del registro civil, interdicción y medidas de apoyo, cambios de nombre y declaraciones de estado civil.',
    services: [
      'Corrección y rectificación del registro civil',
      'Medidas de apoyo y capacidad legal',
      'Cambio de nombre y corrección de componente de sexo',
      'Declaración de ausencia y muerte presunta',
    ],
  },
]

export function getArea(slug) {
  return areas.find((a) => a.slug === slug)
}
