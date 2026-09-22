import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset URLs so the build works under /Fitness/ironlog/ on GitHub Pages.
  base: './',
  plugins: [react(), tailwindcss()],
})
