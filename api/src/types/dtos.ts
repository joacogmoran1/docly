// Los DTOs se documentan con JSDoc para mantener la documentación de tipos
// sin depender de TypeScript.

/**
 * @typedef {Object} SessionUser
 * @property {string} id
 * @property {'patient' | 'professional'} role
 * @property {string} fullName
 * @property {string} email
 * @property {string} subtitle
 * @property {string} avatar
 * @property {Permission[]} permissions
 */

/**
 * @typedef {'appointments:read' | 'appointments:write' | 'records:read' | 'records:write' |
 *   'prescriptions:read' | 'prescriptions:write' | 'studies:read' | 'studies:write' |
 *   'patients:read' | 'patients:write' | 'offices:read' | 'offices:write' |
 *   'privacy:read' | 'privacy:write' | 'profile:read' | 'profile:write'} Permission
 */

/**
 * @typedef {Object} AuthTokens
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {string} expiresAt
 */

/**
 * @typedef {Object} LoginResponse
 * @property {SessionUser} user
 * @property {string} token
 */

/**
 * @typedef {Object} ProfessionalCard
 * @property {string} id
 * @property {string} fullName
 * @property {string} specialty
 * @property {string[]} coverage
 * @property {string} location
 * @property {{id: string, name: string}[]} offices
 * @property {string|null} nextAvailable
 * @property {boolean} isInTeam
 * @property {string} bio
 */

/**
 * @typedef {Object} AppointmentItem
 * @property {string} id
 * @property {string} professionalName
 * @property {string} specialty
 * @property {string} date
 * @property {string} office
 * @property {'Confirmado' | 'Pendiente' | 'Cancelado'} status
 * @property {'Presencial' | 'Virtual'} type
 */

/**
 * @typedef {Object} StudyItem
 * @property {string} id
 * @property {string} title
 * @property {string} category
 * @property {string} requestedBy
 * @property {string} date
 * @property {'Disponible' | 'Pendiente' | 'Vencido'} status
 * @property {string} reportSummary
 * @property {string[]} images
 */

/**
 * @typedef {Object} PrescriptionItem
 * @property {string} id
 * @property {string} medication
 * @property {string} professionalName
 * @property {string} date
 * @property {string} dose
 */

/**
 * @typedef {Object} HealthSection
 * @property {string} id
 * @property {string} title
 * @property {string[]} items
 * @property {string} updatedAt
 * @property {string} privacy
 */

/**
 * @typedef {Object} PatientListItem
 * @property {string} id
 * @property {string} fullName
 * @property {number} age
 * @property {string} document
 * @property {string} phone
 * @property {string} coverage
 * @property {string|null} lastVisit
 * @property {string|null} nextAppointment
 * @property {string[]} alerts
 * @property {number} studiesCount
 * @property {number} reportsCount
 * @property {number} imagesCount
 */

/**
 * @typedef {Object} OfficeItem
 * @property {string} id
 * @property {string} name
 * @property {string} address
 * @property {string} notes
 * @property {string} days
 * @property {string} schedule
 * @property {string} appointmentDuration
 * @property {{day: string, hours: string, duration: string}[]} weeklyRules
 * @property {string[]} blockedDates
 * @property {{date: string, times: string[]}[]} blockedTimes
 */

/**
 * @typedef {Object} ScheduleEvent
 * @property {string} id
 * @property {string} officeId
 * @property {string} [patientId]
 * @property {string} patientName
 * @property {string} officeName
 * @property {string} date
 * @property {'Confirmado' | 'Pendiente' | 'Cancelado' | 'Bloqueado'} status
 * @property {string} reason
 */

// Este archivo solo exporta documentación de tipos via JSDoc.
// No tiene exports de runtime.