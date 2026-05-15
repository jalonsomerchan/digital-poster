# Digital Poster

Editor visual para crear pantallas de **digital signage** desde el navegador.

Permite montar una pantalla para televisión con varias páginas, widgets editables y una URL pública generada a partir de la configuración.

## Funcionalidades

- Dashboard visual para diseñar una pantalla 16:9.
- Widgets movibles y redimensionables con ratón o táctil.
- Varias páginas por pantalla.
- Duración configurable por página.
- Color de fondo configurable por página.
- URL de visor para abrir en una televisión.
- Guardado automático en `localStorage`.
- Botón para resetear el diseño local.
- Exportación e importación de la configuración en JSON.

## Widgets disponibles

- Texto libre: color, tamaño, fuente del sistema, negrita, cursiva y separación de letras.
- URL / QR: genera un QR a partir de una URL y permite configurar colores.
- Fecha y hora: solo fecha, solo hora o fecha y hora.
- Imagen: muestra una imagen remota desde una URL.
- Tiempo actual: consulta el tiempo de un municipio.
- Previsión del tiempo: consulta previsión para los próximos días.

> El tiempo se consulta desde el navegador mediante APIs públicas de Open-Meteo. La generación del QR usa el servicio público de `api.qrserver.com`.

## Uso

```sh
nvm use
npm ci
npm run dev
```

Abre el editor en:

```txt
http://localhost:4321/
```

El editor genera una URL de visor con la configuración codificada. Esa URL se puede abrir en la televisión o en un navegador a pantalla completa.

Ruta del visor:

```txt
/display/?config=...
```

## Comandos

| Comando | Acción |
| --- | --- |
| `npm run dev` | Arranca el servidor local de Astro |
| `npm run build` | Genera la web estática en `dist/` |
| `npm run preview` | Previsualiza el build localmente |
| `npm test` | Ejecuta tests smoke básicos |
| `npm run format` | Formatea CSS, JS, JSON, Markdown, MJS, TS y YAML |
| `npm run format:check` | Comprueba formato |
| `npm run clean` | Borra `dist` y `.astro` |

## Arquitectura

```text
src/
├── components/
│   ├── PosterBuilder.astro
│   └── PosterViewer.astro
├── data/
│   └── widgetTypes.ts
├── pages/
│   ├── display/
│   │   └── index.astro
│   └── index.astro
├── scripts/
│   └── poster-runtime.js
└── utils/
    └── posterState.ts
```

La configuración editable vive en el navegador. No hay backend ni base de datos. Esto permite desplegar la aplicación como sitio estático, incluyendo GitHub Pages.

## Documentación para agentes IA

Antes de modificar el proyecto, una IA debe leer:

- `agents.md`: reglas principales del repositorio.
- `docs/ai-checklist.md`: checklist rápida antes de cerrar tareas.
- `docs/design-system.md`: reglas visuales, SEO, accesibilidad y responsive.
- `docs/github-pages.md`: compatibilidad con dominio raíz, subrutas y GitHub Pages.
- `docs/i18n-guide.md`: soporte de traducciones.
- `docs/testing-guide.md`: mantenimiento de tests smoke.
- `docs/template-usage.md`: convenciones heredadas de la base Astro.

## CI

`.github/workflows/ci.yml` ejecuta en pull requests:

```sh
npm ci
npm test
npm run build
```

## GitHub Pages

El proyecto mantiene compatibilidad con despliegue en dominio raíz y subruta.

Por defecto, cuando corre en GitHub Actions, `astro.config.mjs` calcula automáticamente:

- `site`: `https://OWNER.github.io`
- `base`: `/NOMBRE_DEL_REPO`

Puedes sobrescribirlo con variables de entorno:

```env
ASTRO_SITE=https://example.com
ASTRO_BASE=/
```
