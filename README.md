# Condominio Front

## Probar la cámara desde un celular

La cámara del navegador requiere un contexto seguro: HTTPS o `localhost`. El
proyecto usa `@vitejs/plugin-basic-ssl`: instala las dependencias y levanta Vite
para generar automáticamente un certificado de desarrollo, sin permisos de
administrador ni cambios en el almacén de confianza del sistema:

```bash
npm install
npm run dev
```

Reemplaza la IP de ejemplo por la IP local real del computador y abre desde el
celular `https://<IP>:5173`. Como el certificado es autofirmado, el celular
mostrará una advertencia de certificado no confiable que hay que aceptar una vez.
Después de aceptarla, el origen HTTPS cuenta como contexto seguro y el navegador
puede solicitar acceso a la cámara.

### Certificados propios (opcional)

Quien ya tenga certificados puede guardarlos en estas rutas:

```text
.cert/localhost.pem
.cert/localhost-key.pem
```

Cuando ambos existen, Vite los usa en lugar del certificado generado por el
plugin. Los certificados no se deben versionar.

### API HTTPS y contenido mixto

Un front servido por HTTPS **no puede llamar una API por HTTP**. Por ejemplo, si
`VITE_API_URL=http://192.168.1.100:8000/api`, el navegador bloqueará todas las
peticiones por contenido mixto y la aplicación mostrará un «Error de red».

Para probar la cámara en HTTPS local, el camino más simple es configurar
`VITE_API_URL` con la URL HTTPS del backend ya desplegado en PythonAnywhere y
agregar el origen local del front (por ejemplo, `https://192.168.1.100:5173`) a
`CORS_ALLOWED_ORIGINS` en `condominio_back`.

Como alternativa, publica **ambos servicios** (front y backend) mediante túneles
HTTPS, por ejemplo con ngrok. Configura `VITE_API_URL` con el túnel HTTPS del
backend, agrega el origen del túnel del front a `CORS_ALLOWED_ORIGINS` y los
hostnames correspondientes a `ALLOWED_HOSTS` en `condominio_back`.

## Desarrollo

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
