# 📡 API Documentation - Docly Backend

Base URL: `http://localhost:4000/api`

Todas las rutas (excepto autenticación) requieren estar autenticado.

## 🔑 Autenticación

### Registrar Usuario

**Endpoint:** `POST /auth/register`

**Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123",
  "name": "Juan",
  "lastName": "Pérez",
  "phone": "+54 11 1234-5678",
  "role": "patient",
  
  // Solo si role = "professional":
  "specialty": "Cardiología",
  "licenseNumber": "MN12345"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "name": "Juan",
    "lastName": "Pérez",
    "role": "patient"
  }
}
```

**Cookie establecida:** `token` (httpOnly)

---

### Login

**Endpoint:** `POST /auth/login`

**Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "name": "Juan",
    "role": "patient"
  }
}
```

**Cookie establecida:** `token` (httpOnly)

---

### Logout

**Endpoint:** `POST /auth/logout`

**Response (200):**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente."
}
```

**Cookie eliminada:** `token`

---

### Obtener Perfil

**Endpoint:** `GET /auth/profile`

**Headers:** `Cookie: token=...`

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "name": "Juan",
    "role": "patient",
    "patient": { ... },
    "professional": null
  }
}
```

---

## 👤 Pacientes

### Obtener Paciente

**Endpoint:** `GET /patients/:id`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "birthDate": "1990-01-01",
    "gender": "male",
    "bloodType": "O+",
    "medicalCoverage": "OSDE",
    "user": {
      "name": "Juan",
      "lastName": "Pérez",
      "email": "juan@example.com"
    },
    "healthInfo": { ... }
  }
}
```

---

### Actualizar Paciente

**Endpoint:** `PUT /patients/:id`

**Permisos:** Solo paciente dueño

**Body:**
```json
{
  "birthDate": "1990-01-01",
  "gender": "male",
  "bloodType": "O+",
  "medicalCoverage": "OSDE",
  "coverageNumber": "123456",
  "name": "Juan Carlos",
  "phone": "+54 11 9876-5432"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### Obtener Información de Salud

**Endpoint:** `GET /patients/:id/health`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patientId": "uuid",
    "diseases": ["Hipertensión", "Diabetes tipo 2"],
    "allergies": ["Penicilina", "Polen"],
    "medications": ["Enalapril 10mg - 1 vez al día"],
    "notes": "Notas adicionales..."
  }
}
```

---

### Actualizar Información de Salud

**Endpoint:** `PUT /patients/:id/health`

**Permisos:** Solo paciente dueño

**Body:**
```json
{
  "diseases": ["Hipertensión"],
  "allergies": ["Penicilina"],
  "medications": ["Enalapril 10mg"],
  "notes": "Notas..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

---

## 👨‍⚕️ Profesionales

### Buscar Profesionales

**Endpoint:** `GET /professionals/search?q=nombre&specialty=Cardiología&coverage=OSDE`

**Query Params:**
- `q` (opcional): Búsqueda por nombre
- `specialty` (opcional): Filtrar por especialidad
- `coverage` (opcional): Filtrar por cobertura aceptada

**Response (200):**
```json
{
  "success": true,
  "results": 2,
  "data": [
    {
      "id": "uuid",
      "specialty": "Cardiología",
      "licenseNumber": "MN12345",
      "fees": 5000,
      "user": {
        "name": "Dr. García",
        "lastName": "López",
        "email": "garcia@example.com"
      }
    }
  ]
}
```

---

### Obtener Profesional

**Endpoint:** `GET /professionals/:id`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "specialty": "Cardiología",
    "licenseNumber": "MN12345",
    "acceptedCoverages": ["OSDE", "Swiss Medical"],
    "fees": 5000,
    "user": { ... },
    "offices": [ ... ]
  }
}
```

---

### Actualizar Profesional

**Endpoint:** `PUT /professionals/:id`

**Permisos:** Solo profesional dueño

**Body:**
```json
{
  "specialty": "Cardiología Pediátrica",
  "acceptedCoverages": ["OSDE", "Galeno"],
  "fees": 6000
}
```

---

### Agregar Profesional al Equipo

**Endpoint:** `POST /professionals/patients/:patientId/professionals/:professionalId`

**Permisos:** Solo el paciente

**Response (201):**
```json
{
  "success": true,
  "message": "Profesional agregado al equipo exitosamente."
}
```

---

### Quitar Profesional del Equipo

**Endpoint:** `DELETE /professionals/patients/:patientId/professionals/:professionalId`

**Permisos:** Solo el paciente

**Response (200):**
```json
{
  "success": true,
  "message": "Profesional removido del equipo."
}
```

---

### Obtener Profesionales del Paciente

**Endpoint:** `GET /professionals/patients/:patientId/professionals`

**Response (200):**
```json
{
  "success": true,
  "results": 3,
  "data": [ ... ]
}
```

---

## 🏢 Consultorios

### Crear Consultorio

**Endpoint:** `POST /offices`

**Permisos:** Solo profesionales

**Body:**
```json
{
  "name": "Consultorio Centro",
  "address": "Av. Corrientes 1234, CABA",
  "phone": "+54 11 1234-5678",
  "appointmentDuration": 30,
  "schedule": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "13:00",
      "isActive": true
    },
    {
      "dayOfWeek": 2,
      "startTime": "14:00",
      "endTime": "18:00",
      "isActive": true
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Consultorio Centro",
    "address": "Av. Corrientes 1234",
    "schedules": [ ... ]
  }
}
```

---

### Obtener Consultorio

**Endpoint:** `GET /offices/:id`

**Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### Obtener Consultorios del Profesional

**Endpoint:** `GET /offices/professional/:professionalId`

**Response (200):**
```json
{
  "success": true,
  "results": 2,
  "data": [ ... ]
}
```

---

### Actualizar Consultorio

**Endpoint:** `PUT /offices/:id`

**Permisos:** Solo profesional dueño

**Body:**
```json
{
  "name": "Consultorio Norte",
  "address": "Nueva dirección",
  "phone": "Nuevo teléfono"
}
```

---

### Eliminar Consultorio

**Endpoint:** `DELETE /offices/:id`

**Permisos:** Solo profesional dueño

**Response (200):**
```json
{
  "success": true,
  "message": "Consultorio eliminado exitosamente."
}
```

---

## 📅 Turnos

### Crear Turno

**Endpoint:** `POST /appointments`

**Body:**
```json
{
  "patientId": "uuid",
  "professionalId": "uuid",
  "officeId": "uuid",
  "date": "2024-01-15",
  "time": "10:00",
  "duration": 30,
  "reason": "Consulta de control"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "date": "2024-01-15",
    "time": "10:00",
    "status": "scheduled",
    "patient": { ... },
    "professional": { ... },
    "office": { ... }
  }
}
```

---

### Obtener Turno

**Endpoint:** `GET /appointments/:id`

**Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### Obtener Turnos del Paciente

**Endpoint:** `GET /appointments/patient/:patientId`

**Response (200):**
```json
{
  "success": true,
  "results": 5,
  "data": [ ... ]
}
```

---

### Obtener Turnos del Profesional

**Endpoint:** `GET /appointments/professional/:professionalId?date=2024-01-15&status=scheduled`

**Query Params:**
- `date` (opcional): Filtrar por fecha
- `status` (opcional): Filtrar por estado

**Response (200):**
```json
{
  "success": true,
  "results": 3,
  "data": [ ... ]
}
```

---

### Actualizar Turno

**Endpoint:** `PUT /appointments/:id`

**Body:**
```json
{
  "date": "2024-01-16",
  "time": "11:00",
  "status": "confirmed",
  "notes": "Paciente confirmó asistencia"
}
```

---

### Cancelar Turno

**Endpoint:** `POST /appointments/:id/cancel`

**Body:**
```json
{
  "reason": "Motivo de cancelación"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "cancelled",
    "cancellationReason": "Motivo..."
  }
}
```

---

## 🔐 Autenticación de Requests

Todos los endpoints (excepto `/auth/register` y `/auth/login`) requieren cookie `token`.

El frontend envía automáticamente la cookie con `credentials: 'include'`.

## ⚠️ Errores

Formato de error:
```json
{
  "success": false,
  "message": "Descripción del error"
}
```

### Códigos de estado:

- `200` - OK
- `201` - Creado
- `400` - Bad Request (validación)
- `401` - No autenticado
- `403` - No autorizado
- `404` - No encontrado
- `500` - Error del servidor

---

## 🔄 Rate Limiting

- **Global:** 100 requests / 15 minutos por IP
- **Login:** 5 intentos / 15 minutos

---

¡API lista para usar! 🚀
