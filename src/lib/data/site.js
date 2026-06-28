// Datos institucionales reales del despacho.
export const site = {
  name: 'Proenza Abogados',
  shortName: 'Proenza',
  tagline: 'Asesoría y representación jurídica en todas las áreas del derecho civil colombiano.',
  description:
    'Proenza Abogados es un despacho jurídico colombiano especializado en derecho civil: familia, sucesiones, contratos, bienes, obligaciones y responsabilidad civil. Asesoría clara y representación cercana.',
  phone: '(+57) 324 158-6919',
  phone2: '(+57) 304 494-5357',
  whatsapp: '573241586919', // sólo dígitos, formato internacional
  email: 'contacto@proenzalegal.com',
  address: 'Calle 11 # 3-58, Of. 508',
  hours: 'Lun – Vie · 9:00–11:00 y 14:00–16:00',
  city: 'Cali, Colombia',
  // Agenda en línea (Citaly). PLACEHOLDER — reemplazar por la URL real del despacho.
  // Puede sobreescribirse por abogado con `citalyUrl` en data/abogados.js.
  citalyUrl: 'https://citaly.co/proenza',
  social: {
    facebook: 'https://www.facebook.com/people/Abogados-Proenza/61555305772031/',
    instagram: 'https://www.instagram.com/abogadosproenza/',
    x: 'https://x.com/abogadosproenza',
    youtube: 'https://www.youtube.com/@PROENZAAbogados',
  },
}

// Enlace de WhatsApp con mensaje prellenado.
export function whatsappLink(message = 'Hola, me gustaría recibir asesoría jurídica.') {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`
}
