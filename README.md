# Condominio Front

## Probar la cámara desde un celular

La cámara del navegador requiere un contexto seguro: HTTPS o `localhost`. Vite ya
expone el servidor en la red local y activa HTTPS cuando encuentra estos archivos:

```text
.cert/localhost.pem
.cert/localhost-key.pem
```

Instala [mkcert](https://github.com/FiloSottile/mkcert), crea un certificado que
incluya la IP local del computador y levanta Vite:

```bash
mkdir -p .cert
mkcert -install
mkcert -cert-file .cert/localhost.pem -key-file .cert/localhost-key.pem localhost 127.0.0.1 ::1 192.168.1.100
npm run dev
```

Reemplaza `192.168.1.100` por la IP local real y abre desde el celular la URL
`https://<IP>:5173`. El certificado de desarrollo es local/autofirmado: puede que
el celular pida aceptarlo o instalar la CA de mkcert una vez. Los certificados no
se deben versionar.

Como alternativa se puede publicar el puerto local mediante un túnel HTTPS, por
ejemplo con ngrok. En ese caso agrega el origen del túnel a
`CORS_ALLOWED_ORIGINS` y su hostname a `ALLOWED_HOSTS` en `condominio_back`.

Si no existen los archivos de certificado, Vite continúa disponible por HTTP
para trabajo sin cámara.

## Desarrollo

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
