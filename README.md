# Proenza Abogados — el despacho como videojuego web

La web **es** el despacho. Toda la página es un mundo 3D diminuto (estilo
*Messenger* de abeto.co) por el que caminas con un personaje en tercera persona:
te acercas a cada zona del despacho —recepción, áreas de práctica, abogados,
biblioteca, agenda, casos, contacto— y su información se abre dentro del propio juego.

> *Asesoría y representación jurídica en todas las áreas del derecho civil colombiano.*

## Stack

- **[SvelteKit](https://kit.svelte.dev)** (una sola página a pantalla completa).
- **[Three.js](https://threejs.org)** — planeta, personaje, estaciones y cámara. Carga diferida; respaldo accesible (menú de secciones) si no hay WebGL.
- **[mdsvex](https://mdsvex.pngwn.io)** — la biblioteca/blog se escribe en **markdown**.

## Cómo se juega

- **WASD / flechas** o **arrastrar el dedo** (joystick) para caminar por el planeta.
- **Espacio** para saltar.
- Acércate a una estación → aparece **“Entrar · …”** → pulsa **E** (o toca el botón) para abrir su panel.
- También puedes hacer clic en las etiquetas flotantes o usar el menú **“Secciones”** (acceso directo / accesibilidad).

## Estructura

```
src/
  app.css                 sistema de diseño (paleta azul + cálida, tipografía)
  lib/
    data/                 site, areas, abogados, posts, nav
    content/blog/*.md       artículos del blog (markdown)
    components/           Seo, AreaIcon
    game/
      OfficePlanet.svelte el juego: escena, caminar, cámara, proximidad, HUD
      world.js            planeta + estaciones (edificios) + decorados
      avatar.js           el personaje
      Panel.svelte        panel de información que se abre por estación
  routes/+page.svelte     monta el juego a pantalla completa
static/favicon.svg
```

## Decisiones

- **El juego es la web** (no un adorno): se priorizó la experiencia inmersiva sobre el SEO, por petición expresa.
- Sin backend: los formularios de cita y caso arman un mensaje de **WhatsApp**. Migrable a un panel cuando se necesite.
- Paleta **azul institucional + neutros cálidos**, acento latón para las acciones.

## Pendientes (contenido de ejemplo)

- Datos reales en `src/lib/data/site.js` (WhatsApp, correo, dirección).
- Logo (lo aportará el cliente) — por ahora monograma “P”.
- Abogados y fotos reales en `src/lib/data/abogados.js`.
- Textos definitivos de áreas en `src/lib/data/areas.js`.
- Nuevos artículos: agregar un `.md` en `src/lib/content/blog/` (cita el título si lleva `:`).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # sitio estático en build/
npm run preview
```
