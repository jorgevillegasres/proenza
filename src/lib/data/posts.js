// Índice del blog construido a partir de los archivos markdown en /content/blog.
// mdsvex expone `metadata` (frontmatter) y `default` (el componente) por archivo.
const modules = import.meta.glob('/src/lib/content/blog/*.md', { eager: true })

function slugFromPath(path) {
  return path.split('/').pop().replace(/\.md$/, '')
}

export const posts = Object.entries(modules)
  .map(([path, mod]) => ({
    slug: slugFromPath(path),
    component: mod.default,
    ...mod.metadata,
  }))
  .sort((a, b) => new Date(b.date) - new Date(a.date))

export function getPost(slug) {
  return posts.find((p) => p.slug === slug)
}

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}
