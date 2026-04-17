# 🏥 Docly Backend - Sistema de Gestión de Salud

Backend de producción con arquitectura escalable y segura.

## 🚀 Características

- ✅ Autenticación segura con JWT en httpOnly cookies
- ✅ Validación exhaustiva de inputs
- ✅ Rate limiting para prevenir abuso
- ✅ Logging estructurado
- ✅ Arquitectura Clean (Controllers/Services/Repositories)
- ✅ Queries optimizadas con índices
- ✅ Manejo robusto de errores
- ✅ Protección contra inyecciones SQL, XSS, CSRF

## 📦 Instalación

```bash
npm install
```

## ⚙️ Configuración

1. Copiar `.env.example` a `.env`
2. Configurar variables de entorno
3. Crear base de datos PostgreSQL

```bash
createdb docly_db
```

## 🗄️ Migraciones

```bash
npm run db:migrate
npm run db:rollback
npm run db:seed
```

## 🚀 Ejecución

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

## 📁 Estructura

```
src/
├── config/          # Configuración
├── database/        # Modelos y migraciones
├── middleware/      # Middlewares
├── controllers/     # Controladores
├── services/        # Lógica de negocio
├── routes/          # Rutas
├── utils/           # Utilidades
└── server.js        # Punto de entrada
```

## 🔒 Seguridad

- JWT en httpOnly cookies
- Bcrypt para passwords (salt rounds: 12)
- Helmet para headers seguros
- Rate limiting compartido en base de datos
- Rate limiting opcional en Redis para desacoplarlo de Postgres
- CSRF con cookie firmada + header
- Validación con express-validator
- CORS multi-origen validado por entorno
- Limpieza programada de tokens vencidos y filas viejas de rate limiting

## 🧪 Checks

```bash
npm test
npm run smoke:load
npm run test:booking-concurrency
```

## 📊 API Endpoints

Ver documentación en `/docs/API.md`
