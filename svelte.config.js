import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { mdsvex } from 'mdsvex'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Treat .svelte and .md as components so blog articles can live as markdown.
  extensions: ['.svelte', '.md'],
  preprocess: [vitePreprocess(), mdsvex({ extensions: ['.md'] })],
  kit: {
    // Fully prerendered static site — fast, cheap to host.
    adapter: adapter({
      fallback: '404.html',
    }),
    // En GitHub Pages el sitio vive en /<repo>; BASE_PATH lo inyecta el workflow.
    // En local/otros hosts queda en la raíz ('').
    paths: {
      base: process.env.BASE_PATH || '',
    },
    prerender: {
      handleHttpError: 'warn',
    },
  },
}

export default config
