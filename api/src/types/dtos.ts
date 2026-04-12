// DTOs para las respuestas del API que el frontend espera

export interface SessionUser {
	id: string;
	role: 'patient' | 'professional';
	fullName: string;
	email: string;
	subtitle: string;
	avatar: string;
	permissions: Permission[];
}

export type Permission =
	| 'appointments:read'
	| 'appointments:write'
	| 'records:read'
	| 'records:write'
	| 'prescriptions:read'
	| 'prescriptions:write'
	| 'studies:read'
	| 'studies:write'
	| 'patients:read'
	| 'patients:write'
	| 'offices:read'
	| 'offices:write'
	| 'privacy:read'
	| 'privacy:write'
	| 'profile:read'
	| 'profile:write';

export interface AuthTokens {
	accessToken: string;
	refreshToken: string;
	expiresAt: string;
}

export interface LoginResponse {
	user: SessionUser;
	tokens: AuthTokens;
}

// DTOs de UI compartidos
export interface ProfessionalCard {
	id: string;
	fullName: string;
	specialty: string;
	coverage: string[];
	location: string;
	offices: { id: string; name: string }[];
	nextAvailable: string | null;
	isInTeam: boolean;
	bio: string;
}

export interface AppointmentItem {
	id: string;
	professionalName: string;
	specialty: string;
	date: string;
	office: string;
	status: 'Confirmado' | 'Pendiente' | 'Cancelado';
	type: 'Presencial' | 'Virtual';
}

export interface StudyItem {
	id: string;
	title: string;
	category: string;
	requestedBy: string;
	date: string;
	status: 'Disponible' | 'Pendiente' | 'Vencido';
	reportSummary: string;
	images: string[];
}

export interface PrescriptionItem {
	id: string;
	medication: string;
	professionalName: string;
	date: string;
	dose: string;
}

export interface HealthSection {
	id: string;
	title: string;
	items: string[];
	updatedAt: string;
	privacy: string;
}

export interface PatientListItem {
	id: string;
	fullName: string;
	age: number;
	document: string;
	phone: string;
	coverage: string;
	lastVisit: string | null;
	nextAppointment: string | null;
	alerts: string[];
	studiesCount: number;
	reportsCount: number;
	imagesCount: number;
}

export interface OfficeItem {
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

export interface ScheduleEvent {
	id: string;
	officeId: string;
	patientId?: string;
	patientName: string;
	officeName: string;
	date: string;
	status: 'Confirmado' | 'Pendiente' | 'Cancelado' | 'Bloqueado';
	reason: string;
}

export interface AgendaDay {
	date: string;
	officeId: string;
	freeSlots: string[];
	bookedSlots: ScheduleEvent[];
}

export interface ActivityItem {
	id: string;
	title: string;
	description: string;
	timestamp: string;
	type: 'record' | 'appointment' | 'prescription' | 'study' | 'audit';
}

// Responses específicas por módulo
export interface PatientDashboardResponse {
	appointments: AppointmentItem[];
	prescriptions: PrescriptionItem[];
	studies: StudyItem[];
}

export interface ProfessionalDetailResponse {
	professional: ProfessionalCard;
	agenda: AgendaDay[];
	records: ActivityItem[];
	prescriptions: PrescriptionItem[];
}

export interface PatientProfileResponse {
	fullName: string;
	email: string;
	phone: string;
	document: string;
	birthDate: string;
	coverage: string;
}

export interface PatientSettingsResponse {
	email: string;
	permissions: {
		id: string;
		professional: string;
		scope: string;
	}[];
}

export interface ProfessionalDashboardResponse {
	todayAgenda: ScheduleEvent[];
	todayPatients: PatientListItem[];
}

export interface PatientFullRecordResponse {
	patient: PatientListItem;
	profile: PatientProfileResponse;
	health: HealthSection[];
	records: ActivityItem[];
	studies: StudyItem[];
	prescriptions: PrescriptionItem[];
}

export interface OfficeDetailResponse {
	office: OfficeItem;
	agenda: AgendaDay[];
}

export interface ProfessionalProfileResponse {
	personal: {
		fullName: string;
		email: string;
		phone: string;
		document: string;
	};
	professional: {
		specialty: string;
		license: string;
		digitalSignature: string;
	};
}
