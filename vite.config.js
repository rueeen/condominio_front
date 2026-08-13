import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, readFileSync } from 'node:fs'

const certificateFiles = ['.cert/localhost-key.pem', '.cert/localhost.pem']
const https = certificateFiles.every(existsSync) ? {
  key: readFileSync(certificateFiles[0]),
  cert: readFileSync(certificateFiles[1]),
} : undefined

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true, https },
})
