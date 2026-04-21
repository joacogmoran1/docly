# Docly - Arquitectura de la aplicacion

Este documento resume la estructura actual del proyecto despues de limpiar la infraestructura de deploy.

## Vista general

Docly esta dividido en dos aplicaciones:

1. `client/`
Frontend SPA en React + TypeScript + Vite.

2. `api/`
Backend REST en Node.js + Express + Sequelize.

## Mapa de alto nivel

```text
docly/
|- client/               # frontend React
|- api/                  # backend Express
`- ARCHITECTURE.md       # documentacion de arquitectura
```

## Frontend

```text
client/src/
|- app/                  # bootstrap, router, guards, layouts, providers
|- assets/               # estilos globales e imagenes
|- modules/              # funcionalidades por dominio
|- services/             # API, auth, seguridad, permisos
|- shared/               # componentes y utilidades compartidas
|- mocks/
`- vite-env.d.ts
```

Puntos principales:

- `app/main.tsx` monta React, `QueryProvider` y `AuthProvider`.
- `app/router/` define rutas publicas y privadas.
- `modules/` organiza la UI por dominios como auth, patient y professional.
- `services/api/` concentra Axios, interceptores, CSRF y manejo de errores.

## Backend

```text
api/src/
|- config/
|- controllers/
|- database/
|- middleware/
|- routes/
|- services/
|- utils/
|- validators/
|- app.js
`- server.js
```

Puntos principales:

- `app.js` construye la app Express y registra middlewares y rutas.
- `server.js` conecta la base y levanta el servidor HTTP.
- `routes/` define los endpoints.
- `controllers/` traduce HTTP a llamadas de negocio.
- `services/` implementa la logica principal.
- `database/models/` contiene los modelos Sequelize y sus relaciones.

## Flujo de una request

```text
Frontend React
-> modulo API del frontend
-> Axios client
-> /api
-> route
-> controller
-> service
-> Sequelize
-> PostgreSQL
-> respuesta JSON
-> mapeo en frontend
-> render de UI
```

## Resumen

El proyecto queda enfocado en desarrollo local con dos capas claras:

- frontend React modular por dominio
- backend Express organizado por rutas, controladores, servicios y modelos
