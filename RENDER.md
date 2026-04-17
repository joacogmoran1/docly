# Deploy En Render

Esta variante deja a Docly listo para arrancar barato en Render y seguir siendo portable a VPS cuando llegue el momento.

## Stack recomendado

- `docly-web`: Static Site de Render
- `docly-api`: Web Service `starter`
- `docly-db`: Render Postgres `basic-256mb`
- sin Redis al inicio

Costo estimado base:

- frontend: `0 USD/mes`
- API: `7 USD/mes`
- Postgres: `6 USD/mes`

Total aproximado: `13 USD/mes` + dominio + proveedor SMTP.

Referencia oficial de precios:

- [Render Pricing](https://render.com/pricing)
- [Render Postgres](https://render.com/docs/postgresql-refresh)
- [Render Static Sites](https://render.com/docs/static-sites)

## Qué se agregó al repo

- [render.yaml](/C:/Users/joaco/Documents/Proyectos/docly/render.yaml): blueprint para crear frontend, API y base de datos
- soporte de backend para `DATABASE_URL` y SSL opcional de Postgres
- soporte de frontend para `VITE_API_BASE_URL`

## Decisiones importantes

1. El backend queda con `RATE_LIMIT_STORE=sequelize`, así no pagás Redis al principio.
2. El frontend usa `VITE_API_BASE_URL`, así en Render puede apuntar a `https://api.tu-dominio.com/api` y en VPS luego volver a `/api` detrás de Nginx.
3. La base se conecta por `DATABASE_URL`, que Render expone de forma natural.

## Requisito clave: usar dominios propios

Para login con cookies HTTP-only, usá dominios reales desde el inicio:

- frontend: `https://app.tu-dominio.com`
- API: `https://api.tu-dominio.com`

En Render, los custom domains están soportados tanto para Static Sites como para Web Services:

- [Custom domains](https://render.com/docs/custom-domains)

Configuración recomendada:

- `VITE_API_BASE_URL=https://api.tu-dominio.com/api`
- `FRONTEND_URLS=https://app.tu-dominio.com`
- `AUTH_COOKIE_DOMAIN=` vacío al inicio

## Cómo crear el deploy

1. Subí el repo a GitHub/GitLab/Bitbucket.
2. En Render, creá un Blueprint apuntando a este repo.
3. Render va a leer [render.yaml](/C:/Users/joaco/Documents/Proyectos/docly/render.yaml).
4. En la creación inicial te va a pedir los valores marcados como `sync: false`.

Valores a completar:

- `VITE_API_BASE_URL`
- `FRONTEND_URLS`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

Los secretos `JWT_SECRET` y `CSRF_SECRET` se generan automáticamente.

## Dominios y DNS

Antes de habilitar login real, agregá:

- `app.tu-dominio.com` al servicio `docly-web`
- `api.tu-dominio.com` al servicio `docly-api`

Después actualizá:

- `VITE_API_BASE_URL=https://api.tu-dominio.com/api`
- `FRONTEND_URLS=https://app.tu-dominio.com`

## SMTP mínimo

El backend hoy exige SMTP en producción. Para que el deploy levante, necesitás:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

Un proveedor simple para arrancar puede ser Resend, Mailgun, Postmark o SendGrid.

## Migración futura a VPS

Cuando pases a VPS:

1. mantenés casi las mismas variables lógicas
2. el frontend puede volver a `VITE_API_BASE_URL=/api`
3. el backend puede dejar `DATABASE_URL` y pasar a `DB_*` o `*_FILE`
4. podés activar Redis y reemplazar `RATE_LIMIT_STORE=sequelize` por `redis`
5. pasás al stack de [DEPLOYMENT.md](/C:/Users/joaco/Documents/Proyectos/docly/DEPLOYMENT.md:1)

## Variables sugeridas para Render

### Frontend

```dotenv
VITE_API_BASE_URL=https://api.tu-dominio.com/api
```

### API

```dotenv
NODE_ENV=production
PORT=10000
TRUST_PROXY=1
DATABASE_URL=postgresql://...
DB_SSL=false
FRONTEND_URLS=https://app.tu-dominio.com
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=lax
RATE_LIMIT_STORE=sequelize
LOG_TO_FILES=false
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Docly" <no-reply@tu-dominio.com>
```
