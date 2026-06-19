import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [sveltekit()],
  assetsInclude: ['**/*.m4a', '**/*.glb'],
  server: {
    port: 3000,
    host: true,
  },
})
