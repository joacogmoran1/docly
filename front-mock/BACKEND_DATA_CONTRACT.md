# Documentacion de Datos Esperados por `front-mock`

## Objetivo

Este documento define **como deberia llegar la data del backend** para alimentar las pantallas del frontend mockeado ubicado en [`front-mock`](C:\Users\joaco\Documents\Proyectos\docly\front-mock).

La fuente funcional de este contrato es:

- [`src/mocks/docly-api.ts`](C:\Users\joaco\Documents\Proyectos\docly\front-mock\src\mocks\docly-api.ts)
- [`src/mocks/patient.ts`](C:\Users\joaco\Documents\Proyectos\docly\front-mock\src\mocks\patient.ts)
- [`src/mocks/professional.ts`](C:\Users\joaco\Documents\Proyectos\docly\front-mock\src\mocks\professional.ts)
- [`src/shared/types/domain.ts`](C:\Users\joaco\Documents\Proyectos\docly\front-mock\src\shared\types\domain.ts)
- [`src/shared/types/auth.ts`](C:\Users\joaco\Documents\Proyectos\docly\front-mock\src\shared\types\auth.ts)

## Criterio general

`front-mock` fue armado con **DTOs orientados a pantalla**, no con entidades de base de datos.  
Eso significa que el backend puede:

1. Responder ya con estos DTOs listos para UI.
2. Responder con entidades mas ricas, pero en ese caso alguien debe mapearlas antes de renderizar.

Para reproducir fielmente el comportamiento de `front-mock`, la opcion mas simple es que el backend o una capa BFF entregue exactamente estas estructuras.

## Reglas de formato

- Las fechas y horas deberian llegar en ISO 8601 cuando el frontend las formatea con `new Date(...)`.
- Los ids son strings.
- Los textos de estado visibles en UI ya vienen humanizados en varios mocks.
- Los arrays nunca deberian venir en `null`; si no hay datos, usar `[]`.
- Los objetos de detalle no deberian venir en `null` para una pantalla valida; si no existe el recurso, responder `404`.

---

## 1. Autenticacion y sesion

### Pantallas

- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`

### DTO de usuario de sesion

```ts
type Role = "patient" | "professional";

type Permission =
  | "appointments:read"
  | "appointments:write"
  | "records:read"
  | "records:write"
  | "prescriptions:read"
  | "prescriptions:write"
  | "studies:read"
  | "studies:write"
  | "patients:read"
  | "patients:write"
  | "offices:read"
  | "offices:write"
  | "privacy:read"
  | "privacy:write"
  | "profile:read"
  | "profile:write";

interface SessionUser {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  subtitle: string;
  avatar: string;
  permissions: Permission[];
}
```

### DTO de tokens

```ts
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}
```

### Login

#### Request esperado por el front

```json
{
  "email": "sofia@docly.app",
  "password": "docly123",
  "role": "patient"
}
```

`role` es opcional en `front-mock`. Si no se manda, el sistema podia autodetectarlo.

#### Response ideal

```json
{
  "user": {
    "id": "pat-01",
    "role": "patient",
    "fullName": "Sofia Martinez",
    "email": "sofia@docly.app",
    "subtitle": "Cobertura Swiss Medical | Plan SMG20",
    "avatar": "SM",
    "permissions": ["appointments:read", "profile:read"]
  },
  "tokens": {
    "accessToken": "mock-access-pat-01",
    "refreshToken": "mock-refresh-pat-01",
    "expiresAt": "2026-12-31T23:59:59.000Z"
  }
}
```

### Register

#### Request esperado por el front

```json
{
  "role": "professional",
  "fullName": "Lucas Herrera",
  "email": "lucas@docly.app",
  "phone": "+54 11 5555 2201",
  "document": "26.440.781",
  "specialty": "Clinica medica",
  "license": "MP 45122",
  "password": "docly123",
  "confirmPassword": "docly123",
  "acceptedTerms": true
}
```

#### Comportamiento UI

La pantalla solo necesita saber si el alta salio bien para avanzar al paso final.

#### Response minima

```json
{
  "success": true
}
```

### Forgot password

#### Request

```json
{
  "email": "sofia@docly.app"
}
```

#### Response minima

```json
{
  "success": true
}
```

---

## 2. DTOs compartidos de UI

### ProfessionalCard

Usado en el listado de profesionales del paciente y en el detalle de un profesional.

```ts
interface ProfessionalCard {
  id: string;
  fullName: string;
  specialty: string;
  coverage: string[];
  location: string;
  offices: { id: string; name: string }[];
  nextAvailable: string;
  isInTeam: boolean;
  bio: string;
}
```

### AppointmentItem

Usado en dashboard del paciente.

```ts
interface AppointmentItem {
  id: string;
  professionalName: string;
  specialty: string;
  date: string;
  office: string;
  status: "Confirmado" | "Pendiente" | "Cancelado";
  type: "Presencial" | "Virtual";
}
```

### StudyItem

```ts
interface StudyItem {
  id: string;
  title: string;
  category: string;
  requestedBy: string;
  date: string;
  status: "Disponible" | "Pendiente" | "Vencido";
  reportSummary: string;
  images: string[];
}
```

### PrescriptionItem

```ts
interface PrescriptionItem {
  id: string;
  medication: string;
  professionalName: string;
  date: string;
  dose: string;
}
```

### HealthSection

```ts
interface HealthSection {
  id: string;
  title: string;
  items: string[];
  updatedAt: string;
  privacy: string;
}
```

### PatientListItem

Usado para buscador y selector de pacientes del profesional.

```ts
interface PatientListItem {
  id: string;
  fullName: string;
  age: number;
  document: string;
  phone: string;
  coverage: string;
  lastVisit: string;
  nextAppointment: string;
  alerts: string[];
  studiesCount: number;
  reportsCount: number;
  imagesCount: number;
}
```

### OfficeItem

```ts
interface OfficeItem {
  id: string;
  name: string;
  address: string;
  notes: string;
  days: string;
  schedule: string;
  appointmentDuration: string;
  weeklyRules: {
    day: string;
    hours: string;
    duration: string;
  }[];
  blockedDates: string[];
  blockedTimes: {
    date: string;
    times: string[];
  }[];
}
```

### AgendaDay y ScheduleEvent

Usados por calendarios, agendas y detalle de consultorio.

```ts
interface ScheduleEvent {
  id: string;
  officeId: string;
  patientId?: string;
  patientName: string;
  officeName: string;
  date: string;
  status: "Confirmado" | "Pendiente" | "Cancelado" | "Bloqueado";
  reason: string;
}

interface AgendaDay {
  date: string;
  officeId: string;
  freeSlots: string[];
  bookedSlots: ScheduleEvent[];
}
```

### ActivityItem

Usado para registros del paciente.

```ts
interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "record" | "appointment" | "prescription" | "study" | "audit";
}
```

---

## 3. Modulo Paciente

## 3.1 Dashboard del paciente

### Pantalla

- `/patient`

### Endpoint sugerido

- `GET /api/patient/dashboard`

### Response esperada

```json
{
  "appointments": [
    {
      "id": "a1",
      "professionalName": "Dra. Valeria Costa",
      "specialty": "Cardiologia",
      "date": "2026-04-09T13:30:00.000Z",
      "office": "Recoleta",
      "status": "Confirmado",
      "type": "Presencial"
    }
  ],
  "prescriptions": [
    {
      "id": "rx1",
      "medication": "Levotiroxina 75 mcg",
      "professionalName": "Dr. Tomas Quiroga",
      "date": "2026-04-08T10:00:00.000Z",
      "dose": "1 comprimido por la manana"
    }
  ],
  "studies": [
    {
      "id": "s1",
      "title": "Laboratorio anual",
      "category": "Laboratorio",
      "requestedBy": "Dr. Tomas Quiroga",
      "date": "2026-04-05T08:00:00.000Z",
      "status": "Disponible",
      "reportSummary": "Valores dentro de rango.",
      "images": []
    }
  ]
}
```

### La pantalla usa

- `appointments[].professionalName`
- `appointments[].specialty`
- `appointments[].date`
- `appointments[].office`
- `appointments[].status`
- `prescriptions[].id`
- `prescriptions[].medication`
- `prescriptions[].dose`
- `prescriptions[].date`
- `studies[].id`
- `studies[].title`
- `studies[].category`
- `studies[].date`

## 3.2 Profesionales del paciente

### Pantalla

- `/patient/professionals`

### Endpoint sugerido

- `GET /api/patient/professionals`

### Response

Array de `ProfessionalCard`.

## 3.3 Detalle de profesional

### Pantalla

- `/patient/professionals/:professionalId`

### Endpoint sugerido

- `GET /api/patient/professionals/:professionalId`

### Response esperada

```json
{
  "professional": {
    "id": "pr-01",
    "fullName": "Dra. Valeria Costa",
    "specialty": "Cardiologia",
    "coverage": ["Swiss Medical", "OSDE"],
    "location": "Recoleta, CABA",
    "offices": [
      { "id": "of1", "name": "Recoleta" },
      { "id": "of3", "name": "Teleconsulta" }
    ],
    "nextAvailable": "2026-04-09T13:30:00.000Z",
    "isInTeam": true,
    "bio": "Seguimiento cardiovascular preventivo."
  },
  "agenda": [
    {
      "date": "2026-04-09",
      "officeId": "of1",
      "freeSlots": ["13:30", "14:00", "14:30"],
      "bookedSlots": [
        {
          "id": "e1",
          "officeId": "of1",
          "patientName": "Paciente reservado",
          "officeName": "Recoleta",
          "date": "2026-04-09T15:00:00.000Z",
          "status": "Confirmado",
          "reason": "Control"
        }
      ]
    }
  ],
  "records": [
    {
      "id": "pa1",
      "title": "Control clinico",
      "description": "Se registro control general y ajuste de medicacion.",
      "timestamp": "2026-04-07T18:30:00.000Z",
      "type": "record"
    }
  ],
  "prescriptions": [
    {
      "id": "rx1",
      "medication": "Levotiroxina 75 mcg",
      "professionalName": "Dr. Tomas Quiroga",
      "date": "2026-04-08T10:00:00.000Z",
      "dose": "1 comprimido por la manana"
    }
  ]
}
```

## 3.4 Registros de salud del paciente

### Pantallas

- `/patient/health`
- `/patient/health/:sectionId`

### Endpoint sugerido

- `GET /api/patient/health`

### Response

Array de `HealthSection`.

### Ejemplo

```json
[
  {
    "id": "h1",
    "title": "Alergias",
    "items": ["Penicilina", "Latex"],
    "updatedAt": "2026-03-10T12:00:00.000Z",
    "privacy": "Visible para profesionales autorizados"
  }
]
```

## 3.5 Detalle de estudio

### Pantalla

- `/patient/studies/:studyId`

### Endpoint sugerido

- `GET /api/patient/studies`
  o
- `GET /api/patient/studies/:studyId`

### Response minima si se usa listado

Array de `StudyItem`.

### La vista de detalle usa

- `title`
- `category`
- `requestedBy`
- `date`
- `images[]`
- `reportSummary`

## 3.6 Detalle de receta

### Pantalla

- `/patient/prescriptions/:prescriptionId`

### Endpoint sugerido

- `GET /api/patient/prescriptions`
  o
- `GET /api/patient/prescriptions/:prescriptionId`

### Response minima

`PrescriptionItem` o array de `PrescriptionItem`.

## 3.7 Perfil del paciente

### Pantalla

- `/patient/profile`

### Endpoint sugerido

- `GET /api/patient/profile`
- `PUT /api/patient/profile`

### Response de lectura

```json
{
  "fullName": "Sofia Martinez",
  "email": "sofia@docly.app",
  "phone": "+54 11 5555 0101",
  "document": "32.145.678",
  "birthDate": "12/09/1992",
  "coverage": "Swiss Medical"
}
```

### Request de guardado esperada por la UI

```json
{
  "fullName": "Sofia Martinez",
  "document": "32.145.678",
  "birthDate": "12/09/1992",
  "phone": "+54 11 5555 0101",
  "coverage": "Swiss Medical"
}
```

## 3.8 Configuracion del paciente

### Pantalla

- `/patient/settings`

### Endpoint sugerido

- `GET /api/patient/settings`
- `PUT /api/patient/settings/account`
- `DELETE /api/patient/settings/permissions/:permissionId`
- `DELETE /api/patient/account`

### Response de lectura

```json
{
  "email": "sofia@docly.app",
  "permissions": [
    {
      "id": "ac1",
      "professional": "Dra. Valeria Costa",
      "scope": "Recetas y estudios cardiologicos"
    }
  ]
}
```

---

## 4. Modulo Profesional

## 4.1 Dashboard del profesional

### Pantalla

- `/professional`

### Endpoint sugerido

- `GET /api/professional/dashboard?officeId=all`

### Response esperada

```json
{
  "todayAgenda": [
    {
      "id": "se4",
      "officeId": "of2",
      "patientId": "pt1",
      "patientName": "Ana Salvatierra",
      "officeName": "Palermo",
      "date": "2026-04-10T11:00:00.000Z",
      "status": "Confirmado",
      "reason": "Revision de estudios"
    }
  ],
  "todayPatients": [
    {
      "id": "pt1",
      "fullName": "Ana Salvatierra",
      "age": 37,
      "document": "28.991.203",
      "phone": "+54 11 5555 1101",
      "coverage": "OSDE 310",
      "lastVisit": "2026-03-18",
      "nextAppointment": "2026-04-10T17:00:00.000Z",
      "alerts": ["Alergia a AINES"],
      "studiesCount": 4,
      "reportsCount": 3,
      "imagesCount": 1
    }
  ]
}
```

Nota: en la UI actual `todayPatients` no se usa directamente, pero el mock lo trae.

## 4.2 Pacientes del profesional

### Pantalla

- `/professional/patients`

### Endpoint sugerido

- `GET /api/professional/patients`

### Response

Array de `PatientListItem`.

### Campos realmente usados por la lista

- `id`
- `fullName`
- `document`
- `coverage`

### Campos usados en otras pantallas y modales

- `phone`
- `lastVisit`
- `nextAppointment`
- `alerts`
- `studiesCount`
- `reportsCount`
- `imagesCount`

## 4.3 Ficha completa del paciente para profesional

### Pantalla

- `/professional/patients/:patientId`

### Endpoint sugerido

- `GET /api/professional/patients/:patientId`

### Response esperada

```json
{
  "patient": {
    "id": "pt1",
    "fullName": "Ana Salvatierra",
    "age": 37,
    "document": "28.991.203",
    "phone": "+54 11 5555 1101",
    "coverage": "OSDE 310",
    "lastVisit": "2026-03-18",
    "nextAppointment": "2026-04-10T17:00:00.000Z",
    "alerts": ["Alergia a AINES"],
    "studiesCount": 4,
    "reportsCount": 3,
    "imagesCount": 1
  },
  "profile": {
    "fullName": "Sofia Martinez",
    "email": "sofia@docly.app",
    "phone": "+54 11 5555 0101",
    "document": "32.145.678",
    "birthDate": "12/09/1992",
    "coverage": "Swiss Medical"
  },
  "health": [
    {
      "id": "h1",
      "title": "Alergias",
      "items": ["Penicilina", "Latex"],
      "updatedAt": "2026-03-10T12:00:00.000Z",
      "privacy": "Visible para profesionales autorizados"
    }
  ],
  "records": [
    {
      "id": "pa1-pt1-0",
      "title": "Control clinico",
      "description": "Se registro control general y ajuste de medicacion.",
      "timestamp": "2026-04-07T18:30:00.000Z",
      "type": "record",
      "summary": "Se registro control general y ajuste de medicacion.",
      "fullText": "Registro completo..."
    }
  ],
  "studies": [],
  "prescriptions": []
}
```

### Importante

El front-mock usa dos capas de perfil:

- `patient`: resumen para listados
- `profile`: ficha individual para detalle

Si se quiere simplificar, se puede devolver una sola entidad y mapearla antes de renderizar.

## 4.4 Crear registro medico desde la ficha

### Pantallas

- `/professional/patients/:patientId?tab=records`
- `/professional/patients/new-record`

### Request esperado por el formulario

```json
{
  "reason": "Control clinico",
  "assessment": "Analisis clinico",
  "indications": "Indicaciones",
  "evolution": "Evolucion",
  "nextControl": "30 dias",
  "attachments": "referencia-opcional"
}
```

### Endpoint sugerido

- `POST /api/professional/patients/:patientId/records`

### Response minima

El front puede refrescar con:

```json
{
  "success": true,
  "recordId": "rec-123"
}
```

## 4.5 Detalle de registro del paciente

### Pantalla

- `/professional/patients/:patientId/records/:recordId`

### Response minima

Si se usa listado previo, basta con encontrar un item que tenga:

```json
{
  "id": "rec-1",
  "title": "Control clinico",
  "timestamp": "2026-04-07T18:30:00.000Z",
  "body": "Texto completo del registro"
}
```

En `front-mock` el listado trae `fullText` y la vista lo usa como cuerpo.

## 4.6 Recetas del paciente y creacion

### Pantallas

- `/professional/patients/:patientId?tab=prescriptions`
- `/professional/patients/:patientId/prescriptions/:prescriptionId`

### Request del formulario mock

El mock aun no serializa un payload final, pero los campos visibles son:

```json
{
  "type": "medicacion",
  "medication": "Losartan 50 mg",
  "dose": "1 comprimido cada 24 hs",
  "duration": "30 dias"
}
```

Tambien existen variantes para:

- `estudio`
- `laboratorio`
- `kinesiologia`
- `internacion`

### Endpoint sugerido

- `POST /api/professional/patients/:patientId/prescriptions`
- `GET /api/professional/patients/:patientId/prescriptions`
- `GET /api/professional/patients/:patientId/prescriptions/:prescriptionId`

### Response de listado

Array de `PrescriptionItem`.

## 4.7 Estudios del paciente

### Pantallas

- `/professional/patients/:patientId?tab=studies`
- `/professional/patients/:patientId/studies/:studyId`

### Response de listado

Array de `StudyItem`.

## 4.8 Agenda general del profesional

### Pantalla

- `/professional/schedule`

### Endpoints sugeridos

- `GET /api/professional/schedule`
- `GET /api/professional/offices`
- `GET /api/professional/patients`

### Response principal

Array de `AgendaDay`.

### Datos adicionales

- Los consultorios llegan como `OfficeItem[]`.
- Los pacientes para el modal de agendado deben cumplir al menos:

```json
[
  {
    "id": "pt1",
    "fullName": "Ana Salvatierra",
    "document": "28.991.203"
  }
]
```

## 4.9 Consultorios del profesional

### Pantallas

- `/professional/offices`
- `/professional/offices/:officeId`

### Endpoints sugeridos

- `GET /api/professional/offices`
- `GET /api/professional/offices/:officeId`
- `PUT /api/professional/offices/:officeId`
- `POST /api/professional/offices/:officeId/appointments`

### Listado

Array de `OfficeItem`.

### Detalle

```json
{
  "office": {
    "id": "of1",
    "name": "Recoleta",
    "address": "Paraguay 1842, CABA",
    "notes": "Consultorio principal",
    "days": "Lunes a jueves",
    "schedule": "09:00 a 17:00",
    "appointmentDuration": "30 min",
    "weeklyRules": [
      {
        "day": "Lunes",
        "hours": "09:00 - 13:00 / 14:00 - 17:00",
        "duration": "30 min"
      }
    ],
    "blockedDates": ["2026-04-19"],
    "blockedTimes": [
      {
        "date": "2026-04-10",
        "times": ["12:00", "12:30"]
      }
    ]
  },
  "agenda": [
    {
      "date": "2026-04-08",
      "officeId": "of1",
      "freeSlots": ["14:00", "15:00", "16:00"],
      "bookedSlots": []
    }
  ]
}
```

## 4.10 Perfil profesional

### Pantalla

- `/professional/profile`

### Endpoint sugerido

- `GET /api/professional/profile`
- `PUT /api/professional/profile`

### Response esperada

```json
{
  "personal": {
    "fullName": "Dr. Lucas Herrera",
    "email": "lucas@docly.app",
    "phone": "+54 11 5555 2201",
    "document": "26.440.781"
  },
  "professional": {
    "specialty": "Clinica medica",
    "license": "MP 45122",
    "digitalSignature": "Firma digital cargada.pdf"
  }
}
```

### Nota sobre profesion y especializacion

La UI maneja dos selects locales:

- `profession`
- `specialization`

Si el backend los modela, conviene responderlos tambien:

```json
{
  "professional": {
    "profession": "medico",
    "specialization": "clinica medica",
    "license": "MP 45122",
    "digitalSignature": "firma.pdf"
  }
}
```

## 4.11 Configuracion profesional

### Pantalla

- `/professional/settings`

### Endpoint sugerido

- `GET /api/professional/settings`
- `PUT /api/professional/settings/account`
- `DELETE /api/professional/account`

### Response minima

```json
{
  "email": "lucas@docly.app"
}
```

---

## 5. Matriz de endpoints minima para replicar `front-mock`

### Auth

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `GET /api/auth/session` o equivalente de restauracion

### Paciente

- `GET /api/patient/dashboard`
- `GET /api/patient/professionals`
- `GET /api/patient/professionals/:professionalId`
- `GET /api/patient/health`
- `GET /api/patient/studies`
- `GET /api/patient/studies/:studyId`
- `GET /api/patient/prescriptions`
- `GET /api/patient/prescriptions/:prescriptionId`
- `GET /api/patient/profile`
- `PUT /api/patient/profile`
- `GET /api/patient/settings`

### Profesional

- `GET /api/professional/dashboard`
- `GET /api/professional/patients`
- `GET /api/professional/patients/:patientId`
- `POST /api/professional/patients/:patientId/records`
- `GET /api/professional/patients/:patientId/records/:recordId`
- `POST /api/professional/patients/:patientId/prescriptions`
- `GET /api/professional/patients/:patientId/prescriptions`
- `GET /api/professional/patients/:patientId/prescriptions/:prescriptionId`
- `GET /api/professional/patients/:patientId/studies`
- `GET /api/professional/patients/:patientId/studies/:studyId`
- `GET /api/professional/schedule`
- `GET /api/professional/offices`
- `GET /api/professional/offices/:officeId`
- `PUT /api/professional/offices/:officeId`
- `GET /api/professional/profile`
- `PUT /api/professional/profile`
- `GET /api/professional/settings`

---

## 6. Recomendacion de implementacion

Si el objetivo es que `front-mock` funcione con la menor friccion posible:

1. Mantener estos DTOs como contrato de integracion.
2. Resolver en backend los joins necesarios.
3. Humanizar estados y textos en un mapper unico.
4. Dejar las fechas en ISO.
5. Evitar que el frontend tenga que reconstruir agendas, listados o cards complejas desde entidades crudas.

## 7. Criterio de exito

La integracion esta completa cuando:

- ninguna pantalla de `front-mock` consume mocks locales
- todas las rutas pueden renderizar con datos del backend
- los detalles encuentran su item por `id`
- los listados no requieren derivaciones pesadas del lado cliente
- los formularios de editar o crear tienen un endpoint claro de lectura y escritura

