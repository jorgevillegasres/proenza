// Estado de idioma compartido (Svelte 5 runes) + diccionario ES/EN.
export const L = $state({ lang: 'es' })
export function toggleLang() {
  L.lang = L.lang === 'es' ? 'en' : 'es'
  try { localStorage.setItem('proenza_lang', L.lang) } catch (e) { void e }
}
export function initLang() {
  try {
    const s = localStorage.getItem('proenza_lang')
    if (s === 'es' || s === 'en') L.lang = s
    else if ((navigator.language || '').toLowerCase().startsWith('en')) L.lang = 'en'
  } catch (e) { void e }
}

const T = {
  es: {
    welcome_eyebrow: 'Despacho jurídico',
    welcome_tag: 'Asesoría y representación jurídica en todas las áreas del derecho civil colombiano.',
    welcome_enter: 'Entrar al despacho',
    welcome_hint: 'Recorre el despacho en primera persona · W/S avanzar · A/D girar',
    explore_title: 'Explore nuestro espacio',
    explore_poi: 'Puntos de interés:',
    explore_discovered: 'Descubiertos:',
    explore_enter: 'Entrar',
    explore_ghost: 'Acércate a una zona…',
    hint_controls_a: 'avanzar',
    hint_controls_b: 'girar',
    hint_controls_c: 'arrastra para mirar',
    badge: 'PROENZA · despacho virtual',
    minimap: 'Plano',
    eyebrow_office: 'Proenza · Agenda',
    eyebrow_reception: 'Proenza · Casos',
    eyebrow_library: 'Proenza · Biblioteca',
    title_office: 'Agenda tu cita',
    title_reception: 'Deja tu caso',
    title_library: 'Biblioteca jurídica',
    citaly_btn: 'Agendar en Citaly',
    or_whatsapp: 'o solicita por WhatsApp',
    whatsapp_req: 'Solicitar por WhatsApp',
    case_send: 'Enviar caso por WhatsApp',
    reception_intro: 'Cuéntanos tu situación y nuestro equipo la analiza para orientarte.',
    l_name: 'Nombre',
    l_contact: 'Contacto',
    l_date: 'Fecha preferida',
    l_detail: 'Detalle',
    l_case: 'Tu caso',
    ph_contact: 'WhatsApp / correo',
    ph_optional: 'opcional',
    confirm_citaly_t: '¡Te abrimos la agenda!',
    confirm_whats_t: '¡Solicitud lista!',
    confirm_case_t: '¡Caso enviado!',
    confirm_citaly_msg: 'Elige tu horario en la pestaña de Citaly que acabamos de abrir. Si no se abrió, escríbenos al ',
    confirm_whats_msg: 'Te llevamos a WhatsApp para confirmar. Si no se abrió, escríbenos al ',
    confirm_case_msg: 'Te llevamos a WhatsApp para que lo recibamos. Si no se abrió, escríbenos al ',
    confirm_close: 'Cerrar',
    blog_back: '← Biblioteca',
    min: 'min',
    st_reception: 'Recepción',
    st_reception_sub: 'Deja tu caso para análisis',
    st_library: 'Biblioteca',
    st_library_sub: 'Artículos y blog',
  },
  en: {
    welcome_eyebrow: 'Law firm',
    welcome_tag: 'Legal advice and representation across every area of Colombian civil law.',
    welcome_enter: 'Enter the office',
    welcome_hint: 'Explore the office in first person · W/S move · A/D turn',
    explore_title: 'Explore our space',
    explore_poi: 'Points of interest:',
    explore_discovered: 'Discovered:',
    explore_enter: 'Enter',
    explore_ghost: 'Get close to an area…',
    hint_controls_a: 'move',
    hint_controls_b: 'turn',
    hint_controls_c: 'drag to look',
    badge: 'PROENZA · virtual office',
    minimap: 'Map',
    eyebrow_office: 'Proenza · Booking',
    eyebrow_reception: 'Proenza · Cases',
    eyebrow_library: 'Proenza · Library',
    title_office: 'Book an appointment',
    title_reception: 'Submit your case',
    title_library: 'Legal library',
    citaly_btn: 'Book on Citaly',
    or_whatsapp: 'or request via WhatsApp',
    whatsapp_req: 'Request via WhatsApp',
    case_send: 'Send case via WhatsApp',
    reception_intro: 'Tell us your situation and our team will review it to guide you.',
    l_name: 'Name',
    l_contact: 'Contact',
    l_date: 'Preferred date',
    l_detail: 'Detail',
    l_case: 'Your case',
    ph_contact: 'WhatsApp / email',
    ph_optional: 'optional',
    confirm_citaly_t: 'Your agenda is open!',
    confirm_whats_t: 'Request ready!',
    confirm_case_t: 'Case sent!',
    confirm_citaly_msg: 'Pick your time in the Citaly tab we just opened. If it did not open, write to us at ',
    confirm_whats_msg: 'We are taking you to WhatsApp to confirm. If it did not open, write to us at ',
    confirm_case_msg: 'We are taking you to WhatsApp to receive it. If it did not open, write to us at ',
    confirm_close: 'Close',
    blog_back: '← Library',
    min: 'min',
    st_reception: 'Reception',
    st_reception_sub: 'Leave your case for review',
    st_library: 'Library',
    st_library_sub: 'Articles & blog',
  },
}

// Roles de abogado (traducción por texto ES).
const ROLES = {
  'Abogado Civilista': 'Civil Lawyer',
  'Abogada Civilista': 'Civil Lawyer',
  'Abogado Tributarista': 'Tax Lawyer',
  'Abogado Informático': 'IT / Tech Lawyer',
}

export function t(key) {
  return (T[L.lang] && T[L.lang][key]) ?? (T.es[key] ?? key)
}
export function tRole(role) {
  return L.lang === 'en' ? ROLES[role] || role : role
}
