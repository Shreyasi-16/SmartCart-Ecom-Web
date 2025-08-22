import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // frontend runs here
    proxy: {
      "/api": "http://localhost:3000", // backend runs here
    },
  },
})
