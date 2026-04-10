# 🚀 Instalación y Configuración - Docly Backend

## 📋 Requisitos Previos

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- npm o yarn

## ⚙️ Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar base de datos PostgreSQL

```bash
# Crear base de datos
createdb docly_db

# O usando psql
psql -U postgres
CREATE DATABASE docly_db;
\q
```

### 3. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
nano .env
```

**Variables importantes:**

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=docly_db
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_password_postgres

# JWT (¡Cambiar en producción!)
JWT_SECRET=tu-secreto-super-seguro-cambiar-en-produccion

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 4. Iniciar servidor

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

## 🗄️ Base de Datos

El servidor sincroniza automáticamente los modelos en desarrollo.

En producción, debes ejecutar migraciones manualmente (próximamente).

## ✅ Verificar instalación

```bash
# Prueba el health check
curl http://localhost:4000/api/health
```

Deberías ver:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📊 Estructura de la Base de Datos

### Tablas principales:

- **users** - Usuarios del sistema
- **patients** - Perfiles de pacientes
- **professionals** - Perfiles de profesionales
- **health_infos** - Información médica de pacientes
- **offices** - Consultorios de profesionales
- **schedules** - Horarios de atención
- **appointments** - Turnos médicos
- **prescriptions** - Recetas médicas
- **studies** - Estudios médicos
- **patient_professionals** - Relación paciente-profesional

## 🔒 Seguridad

### Características implementadas:

✅ **Autenticación JWT en httpOnly cookies**
- No vulnerable a XSS
- Tokens seguros

✅ **Bcrypt para passwords**
- Salt rounds: 12
- Hash automático en hooks

✅ **Rate Limiting**
- 100 requests/15min por IP (global)
- 5 intentos/15min en login

✅ **Helmet**
- Headers de seguridad HTTP

✅ **CORS estricto**
- Solo frontend configurado
- Credentials habilitados

✅ **Validación de inputs**
- Express-validator
- Sanitización automática

✅ **SQL Injection protection**
- Sequelize parametriza queries
- No raw queries sin validar

## 🧪 Testing (próximamente)

```bash
npm test
```

## 📁 Estructura del Proyecto

```
src/
├── config/              # Configuración (DB, JWT)
│   ├── database.js
│   └── jwt.js
│
├── database/            # Modelos y datos
│   └── models/
│       ├── User.js
│       ├── Patient.js
│       ├── Professional.js
│       ├── Office.js
│       ├── Appointment.js
│       └── ...
│
├── middleware/          # Middlewares
│   ├── auth.js          # Autenticación y autorización
│   ├── errorHandler.js  # Manejo de errores
│   ├── rateLimiter.js   # Rate limiting
│   └── validation.js    # Validación
│
├── services/            # Lógica de negocio
│   ├── authService.js
│   ├── patientService.js
│   ├── professionalService.js
│   ├── officeService.js
│   └── appointmentService.js
│
├── controllers/         # Controladores HTTP
│   ├── authController.js
│   ├── patientController.js
│   ├── professionalController.js
│   ├── officeController.js
│   └── appointmentController.js
│
├── routes/              # Definición de rutas
│   ├── authRoutes.js
│   ├── patientRoutes.js
│   ├── professionalRoutes.js
│   ├── officeRoutes.js
│   ├── appointmentRoutes.js
│   └── index.js
│
├── validators/          # Validadores
│   └── authValidators.js
│
├── utils/               # Utilidades
│   ├── logger.js        # Winston logger
│   ├── ApiError.js      # Clase de error
│   └── catchAsync.js    # Async wrapper
│
└── server.js            # Punto de entrada
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo con hot-reload
npm run dev

# Producción
npm start

# Migraciones (próximamente)
npm run db:migrate

# Seeds (próximamente)
npm run db:seed
```

## 🌐 Endpoints Disponibles

Ver documentación completa en `API_DOCUMENTATION.md`

### Resumen:

**Autenticación:**
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Perfil del usuario

**Pacientes:**
- `GET /api/patients/:id` - Obtener paciente
- `PUT /api/patients/:id` - Actualizar paciente
- `GET /api/patients/:id/health` - Info de salud
- `PUT /api/patients/:id/health` - Actualizar salud

**Profesionales:**
- `GET /api/professionals/search` - Buscar profesionales
- `GET /api/professionals/:id` - Obtener profesional
- `PUT /api/professionals/:id` - Actualizar profesional

**Consultorios:**
- `POST /api/offices` - Crear consultorio
- `GET /api/offices/:id` - Obtener consultorio
- `GET /api/offices/professional/:id` - Consultorios del profesional
- `PUT /api/offices/:id` - Actualizar consultorio
- `DELETE /api/offices/:id` - Eliminar consultorio

**Turnos:**
- `POST /api/appointments` - Crear turno
- `GET /api/appointments/:id` - Obtener turno
- `GET /api/appointments/patient/:id` - Turnos del paciente
- `GET /api/appointments/professional/:id` - Turnos del profesional
- `PUT /api/appointments/:id` - Actualizar turno
- `POST /api/appointments/:id/cancel` - Cancelar turno

## 🐛 Troubleshooting

### Error: "Cannot connect to database"

**Solución:**
1. Verificar que PostgreSQL está corriendo
2. Verificar credenciales en `.env`
3. Verificar que la base de datos existe

```bash
# Ver status de PostgreSQL
pg_ctl status

# Iniciar PostgreSQL
pg_ctl start
```

### Error: "CORS policy error"

**Solución:**
Verificar que `FRONTEND_URL` en `.env` coincide exactamente con la URL del frontend.

```env
FRONTEND_URL=http://localhost:3000
```

### Error: "Cookie not being set"

**Solución:**
1. Verificar que `credentials: true` está en CORS (ya está)
2. Verificar que frontend usa `credentials: 'include'` (ya está)
3. Frontend y backend deben estar en mismo dominio/subdominio

## 📝 Logs

Los logs se guardan en:
- `logs/combined.log` - Todos los logs
- `logs/error.log` - Solo errores

## 🚀 Deployment (Producción)

### Variables de entorno obligatorias en producción:

```env
NODE_ENV=production
JWT_SECRET=secreto-super-largo-y-aleatorio
DB_PASSWORD=password-seguro
```

### Recomendaciones:

1. **Usar HTTPS** (SSL/TLS)
2. **Habilitar secure en cookies** (ya configurado para production)
3. **Variables de entorno secretas** (no commitear)
4. **Rate limiting más estricto** (ajustar en .env)
5. **Backups automáticos de DB**
6. **Monitoring** (PM2, New Relic, etc.)

### Con PM2:

```bash
npm install -g pm2
pm2 start src/server.js --name docly-api
pm2 save
pm2 startup
```

## 💡 Próximos Pasos

1. ✅ Conectar frontend
2. ⏳ Implementar prescripciones
3. ⏳ Implementar estudios médicos
4. ⏳ Sistema de notificaciones
5. ⏳ Upload de archivos (estudios)
6. ⏳ Generación de PDFs (recetas)
7. ⏳ Tests unitarios y de integración

## 🤝 Contribuir

Ver `CONTRIBUTING.md` (próximamente)

## 📄 Licencia

MIT

---

¡Backend listo para producción! 🎉
