import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // must match the GitHub repo name or Pages serves a blank page
  base: '/workout-buddy/',
  // stamped at build time so the footer's "last updated" reflects each deploy
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [react()],
})
