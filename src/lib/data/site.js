// Datos institucionales del despacho. Centralizados aquí para reemplazarlos
// fácilmente cuando lleguen los datos reales (logo, teléfonos, dirección).
export const site = {
  name: 'Proenza Abogados',
  shortName: 'Proenza',
  tagline: 'Asesoría y representación jurídica en todas las áreas del derecho civil colombiano.',
  description:
    'Proenza Abogados es un despacho jurídico colombiano especializado en derecho civil: familia, sucesiones, contratos, bienes, obligaciones y responsabilidad civil. Asesoría clara y representación cercana.',
  // Datos de contacto (placeholder — reemplazar por los reales).
  phone: '+57 300 000 0000',
  whatsapp: '573000000000', // sólo dígitos, formato internacional
  email: 'contacto@proenzabogados.co',
  address: 'Calle 00 # 00-00, Bogotá D.C., Colombia',
  hours: 'Lun – Vie · 8:00 a. m. – 6:00 p. m.',
  city: 'Bogotá',
  social: {
    linkedin: '',
    instagram: '',
  },
}

// Enlace de WhatsApp con mensaje prellenado.
export function whatsappLink(message = 'Hola, me gustaría recibir asesoría jurídica.') {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`
}
