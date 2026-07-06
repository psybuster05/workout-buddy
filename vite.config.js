import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // must match the GitHub repo name or Pages serves a blank page
  base: '/workout-buddy/',
  plugins: [react()],
})
