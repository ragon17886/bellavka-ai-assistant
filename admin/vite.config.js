import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/bellavka-ai-assistant/', // важно для GitHub Pages
  build: {
    outDir: '../docs',
    emptyOutDir: true
  }
})