import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { vitePrerenderPlugin } from 'vite-prerender-plugin'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    vitePrerenderPlugin({
      renderTarget: '#root', // Donde se renderiza la app
      prerenderScript: path.resolve(__dirname, 'prerender.tsx'),
      additionalPrerenderRoutes: ['/'], // Pre-renderizar la landing page
    }),
  ],
})
