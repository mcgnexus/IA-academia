# Landing TecRural · IA Sin Líos (Next.js)

Proyecto migrado a Next.js (App Router). Incluye pago Bizum guiado, chatbot IA (Mistral Small) y envío de mensajes por Whapi.

## Desarrollo
- Instala dependencias: `npm install`
- Entorno local: `npm run dev` (http://localhost:3000)
- Build producción: `npm run build` y `npm start`

## Configurar el formulario
En `app/page.jsx` ajusta:
- `GOOGLE_FORM_EMBED_URL`: URL del iframe (termina en `embedded=true`)
- `GOOGLE_FORM_DIRECT_URL` (opcional): enlace normal al formulario

## Variables de entorno (.env.local)
```
NEXT_PUBLIC_MISTRAL_API_KEY=cfPicyj4KrOosgDLcSTYF0NAtaewbP9q
NEXT_PUBLIC_WHAPI_TOKEN=5nYNGKJjpLz4g96MAFj2Jo7Rj3QvQVNS
NEXT_PUBLIC_SITE_URL=https://tusitio.com   # opcional, para OG/base URL
```
> Nota: al usar el prefijo `NEXT_PUBLIC_` las claves siguen siendo visibles en el frontend; lo ideal sigue siendo un backend/proxy que oculte secretos.

## Archivos clave
- `app/page.jsx`: toda la landing y la lógica de Bizum + chat
- `app/layout.jsx`: metadatos y fuente Inter
- `app/globals.css`: estilos globales (importados del diseño original)
- `public/assets/tecrural-logo.png`: logo

## Notas
- Imagen QR usa `quickchart.io`; permitido en `next.config.mjs`.
- ESLint configurado con `next/core-web-vitals` (`npm run lint`).
