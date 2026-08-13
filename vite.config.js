import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, readFileSync } from 'node:fs'

const certificateFiles = ['.cert/localhost-key.pem', '.cert/localhost.pem']
const customCertificate = certificateFiles.every(existsSync)
const https = customCertificate ? {
  key: readFileSync(certificateFiles[0]),
  cert: readFileSync(certificateFiles[1]),
} : undefined

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(!customCertificate ? [basicSsl()] : [])],
  server: { host: true, https },
})
