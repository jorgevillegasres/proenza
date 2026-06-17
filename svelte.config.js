import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { mdsvex } from 'mdsvex'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Treat .svelte and .md as components so blog articles can live as markdown.
  extensions: ['.svelte', '.md'],
  preprocess: [vitePreprocess(), mdsvex({ extensions: ['.md'] })],
  kit: {
    // Fully prerendered static site — fast, cheap to host, and great for SEO.
    adapter: adapter({
      fallback: '404.html',
    }),
    prerender: {
      handleHttpError: 'warn',
    },
  },
}

export default config
