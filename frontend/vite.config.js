import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function backendPort() {
  try {
    const file = path.resolve(__dirname, '..', '.backend-port')
    const port = fs.readFileSync(file, 'utf8').trim()
    if (port) return port
  } catch {
    /* default */
  }
  return '8080'
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort()}`,
        changeOrigin: true,
      },
    },
    allowedHosts: [
      "69c6-2a03-32c0-300b-61a3-3d6c-a3bd-f2bb-6627.ngrok-free.app"
    ]
  },
})

