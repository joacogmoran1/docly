// ✅ FIX: Convertido de .ts a .js — removidas todas las anotaciones TypeScript

/**
 * Mapea un usuario a SessionUser para el frontend
 */
export function mapToSessionUser(user) {
	const role = user.role;
	const permissions = getPermissionsByRole(role);

	let fullName = `${user.name || ''} ${user.lastName || ''}`.trim();
	let subtitle = '';
	let avatar = '';

	if (role === 'patient') {
		const patient = user.patient;
		subtitle = patient?.medicalCoverage
			? `Cobertura ${patient.medicalCoverage}`
			: 'Sin cobertura';
		avatar = getInitials(fullName);
	} else if (role === 'professional') {
		const professional = user.professional;
		subtitle = professional?.specialty || 'Profesional de la salud';
		avatar = getInitials(fullName);
	}

	return {
		id: user.id,
		role,
		fullName,
		email: user.email,
		subtitle,
		avatar,
		permissions,
	};
}

/**
 * Obtiene permisos según el rol
 */
function getPermissionsByRole(role) {
	if (role === 'patient') {
		return [
			'appointments:read',
			'appointments:write',
			'prescriptions:read',
			'studies:read',
			'studies:write',
			'profile:read',
			'profile:write',
			'privacy:read',
			'privacy:write',
		];
	} else if (role === 'professional') {
		return [
			'appointments:read',
			'appointments:write',
			'records:read',
			'records:write',
			'prescriptions:read',
			'prescriptions:write',
			'studies:read',
			'studies:write',
			'patients:read',
			'patients:write',
			'offices:read',
			'offices:write',
			'profile:read',
			'profile:write',
		];
	}
	return [];
}

/**
 * Obtiene iniciales de un nombre completo
 */
function getInitials(fullName) {
	const parts = fullName.split(' ').filter(Boolean);
	if (parts.length === 0) return '?';
	if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Mapea un profesional a ProfessionalCard
 */
export function mapToProfessionalCard(professional, isInTeam = false) {
	const user = professional.user || {};
	const fullName = `${user.name || ''} ${user.lastName || ''}`.trim();

	const offices =
		professional.offices?.map((o) => ({
			id: o.id,
			name: o.name,
		})) || [];

	const nextAvailable = null; // TODO: Calcular basándose en schedules y appointments

	return {
		id: professional.id,
		fullName,
		specialty: professional.specialty || 'Especialidad no especificada',
		coverage: professional.acceptedCoverages || [],
		location: offices[0]?.name || 'Sin ubicación',
		offices,
		nextAvailable,
		isInTeam,
		bio: professional.bio || `Profesional de ${professional.specialty}`,
	};
}

/**
 * Mapea un turno a AppointmentItem
 */
export function mapToAppointmentItem(appointment) {
	const professional = appointment.professional?.user || {};
	const professionalName = `${professional.name || ''} ${professional.lastName || ''}`.trim();

	const statusMap = {
		pending: 'Pendiente',
		confirmed: 'Confirmado',
		completed: 'Completado',
		cancelled: 'Cancelado',
	};
	const status = statusMap[appointment.status] || 'Pendiente';

	return {
		id: appointment.id,
		professionalName: professionalName || 'Profesional',
		specialty: appointment.professional?.specialty || 'Especialidad',
		date: new Date(
			`${appointment.date}T${appointment.time || '00:00:00'}`
		).toISOString(),
		office: appointment.office?.name || 'Consultorio',
		status,
		type: 'Presencial',
	};
}

/**
 * Mapea un estudio a StudyItem
 */
export function mapToStudyItem(study) {
	const professional = study.professional?.user || {};
	const requestedBy = `${professional.name || ''} ${professional.lastName || ''}`.trim();

	const status = study.results ? 'Disponible' : 'Pendiente';

	return {
		id: study.id,
		title: study.type,
		category: study.type,
		requestedBy: requestedBy || 'Autogestión',
		date: new Date(study.date).toISOString(),
		status,
		reportSummary: study.results || 'Pendiente de resultados',
		images: study.fileUrl ? [study.fileUrl] : [],
	};
}

/**
 * Mapea una receta a PrescriptionItem
 */
export function mapToPrescriptionItem(prescription) {
	const professional = prescription.professional?.user || {};
	const professionalName = `${professional.name || ''} ${professional.lastName || ''}`.trim();

	const medications = prescription.medications || [];
	const firstMed = medications[0] || {};
	const medication = firstMed.name || 'Medicación';
	const dose = firstMed.frequency || firstMed.dose || 'Según indicación';

	return {
		id: prescription.id,
		medication,
		professionalName: professionalName || 'Profesional',
		date: new Date(prescription.createdAt).toISOString(),
		dose,
	};
}

/**
 * Mapea healthInfo a array de HealthSection
 */
export function mapToHealthSections(healthInfo) {
	if (!healthInfo) return [];

	const sections = [];

	if (healthInfo.diseases && healthInfo.diseases.length > 0) {
		sections.push({
			id: 'diseases',
			title: 'Enfermedades',
			items: healthInfo.diseases,
			updatedAt: new Date(healthInfo.updatedAt).toISOString(),
			privacy: 'Visible para profesionales autorizados',
		});
	}

	if (healthInfo.allergies && healthInfo.allergies.length > 0) {
		sections.push({
			id: 'allergies',
			title: 'Alergias',
			items: healthInfo.allergies,
			updatedAt: new Date(healthInfo.updatedAt).toISOString(),
			privacy: 'Visible para profesionales autorizados',
		});
	}

	if (healthInfo.medications && healthInfo.medications.length > 0) {
		sections.push({
			id: 'medications',
			title: 'Medicación habitual',
			items: healthInfo.medications,
			updatedAt: new Date(healthInfo.updatedAt).toISOString(),
			privacy: 'Visible para profesionales autorizados',
		});
	}

	return sections;
}

/**
 * Mapea un paciente a PatientListItem
 */
export function mapToPatientListItem(patient, stats) {
	const user = patient.user || {};
	const fullName = `${user.name || ''} ${user.lastName || ''}`.trim();

	let age = 0;
	if (patient.birthDate) {
		age = calculateAge(patient.birthDate);
	}

	return {
		id: patient.id,
		fullName,
		age,
		document: patient.dni || user.document || 'Sin DNI',
		phone: user.phone || 'Sin teléfono',
		coverage: patient.medicalCoverage || 'Sin cobertura',
		lastVisit: stats?.lastAppointmentDate || null,
		nextAppointment: null,
		alerts: [],
		studiesCount: stats?.totalStudies || 0,
		reportsCount: stats?.totalRecords || 0,
		imagesCount: 0,
	};
}

/**
 * Mapea un consultorio a OfficeItem
 */
export function mapToOfficeItem(office) {
	const schedules = office.schedules || [];

	const daysMap = {
		0: 'Domingo',
		1: 'Lunes',
		2: 'Martes',
		3: 'Miércoles',
		4: 'Jueves',
		5: 'Viernes',
		6: 'Sábado',
	};

	const uniqueDays = [
		...new Set(schedules.map((s) => s.dayOfWeek)),
	].sort();
	const days = uniqueDays.map((d) => daysMap[d]).join(', ');

	const times = schedules.map(
		(s) => `${s.startTime.substring(0, 5)} a ${s.endTime.substring(0, 5)}`
	);
	const schedule = times.join(' / ');

	const weeklyRules = schedules.map((s) => ({
		day: daysMap[s.dayOfWeek],
		hours: `${s.startTime.substring(0, 5)} - ${s.endTime.substring(0, 5)}`,
		duration: `${office.appointmentDuration} min`,
	}));

	return {
		id: office.id,
		name: office.name,
		address: office.address,
		notes: office.notes || '',
		days,
		schedule,
		appointmentDuration: `${office.appointmentDuration} min`,
		weeklyRules,
		blockedDates: [],
		blockedTimes: [],
	};
}

/**
 * Mapea un turno a ScheduleEvent
 */
export function mapToScheduleEvent(appointment) {
	const patient = appointment.patient?.user || {};
	const patientName = `${patient.name || ''} ${patient.lastName || ''}`.trim();

	const statusMap = {
		pending: 'Pendiente',
		confirmed: 'Confirmado',
		completed: 'Completado',
		cancelled: 'Cancelado',
	};

	return {
		id: appointment.id,
		officeId: appointment.officeId,
		patientId: appointment.patientId,
		patientName: patientName || 'Paciente',
		officeName: appointment.office?.name || 'Consultorio',
		date: new Date(
			`${appointment.date}T${appointment.time || '00:00:00'}`
		).toISOString(),
		status: statusMap[appointment.status] || 'Pendiente',
		reason: appointment.reason || 'Consulta',
	};
}

/**
 * Mapea un registro médico a ActivityItem
 */
export function mapToActivityItem(record) {
	return {
		id: record.id,
		title: record.reason?.substring(0, 50) || 'Registro médico',
		description: record.diagnosis || record.indications || 'Sin descripción',
		timestamp: new Date(record.date || record.createdAt).toISOString(),
		type: 'record',
	};
}

/**
 * Mapea perfil de paciente a PatientProfileResponse
 */
export function mapToPatientProfile(patient) {
	const user = patient.user || {};
	const fullName = `${user.name || ''} ${user.lastName || ''}`.trim();

	let birthDate = '';
	if (patient.birthDate) {
		birthDate = formatDateDDMMYYYY(patient.birthDate);
	}

	return {
		fullName,
		email: user.email || '',
		phone: user.phone || '',
		document: patient.dni || '',
		birthDate,
		coverage: patient.medicalCoverage || '',
	};
}

/**
 * Calcula edad desde fecha de nacimiento
 */
export function calculateAge(birthDate) {
	if (!birthDate) return 0;
	const birth = new Date(birthDate);
	const today = new Date();
	let age = today.getFullYear() - birth.getFullYear();
	const monthDiff = today.getMonth() - birth.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
		age--;
	}
	return age;
}

/**
 * Formatea fecha a DD/MM/YYYY
 */
export function formatDateDDMMYYYY(date) {
	const d = new Date(date);
	return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
		.toString()
		.padStart(2, '0')}/${d.getFullYear()}`;
}