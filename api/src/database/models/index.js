import User from './User.js';
import Patient from './Patient.js';
import Professional from './Professional.js';
import HealthInfo from './HealthInfo.js';
import Office from './Office.js';
import Schedule from './Schedule.js';
import Appointment from './Appointment.js';
import Prescription from './Prescription.js';
import Study from './Study.js';
import PatientProfessional from './PatientProfessional.js';

// User associations
User.hasOne(Patient, { foreignKey: 'userId', as: 'patient' });
User.hasOne(Professional, { foreignKey: 'userId', as: 'professional' });

Patient.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Professional.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Patient associations
Patient.hasOne(HealthInfo, { foreignKey: 'patientId', as: 'healthInfo' });
Patient.hasMany(Appointment, { foreignKey: 'patientId', as: 'appointments' });
Patient.hasMany(Prescription, { foreignKey: 'patientId', as: 'prescriptions' });
Patient.hasMany(Study, { foreignKey: 'patientId', as: 'studies' });

// Professional associations
Professional.hasMany(Office, { foreignKey: 'professionalId', as: 'offices' });
Professional.hasMany(Appointment, { foreignKey: 'professionalId', as: 'appointments' });
Professional.hasMany(Prescription, { foreignKey: 'professionalId', as: 'prescriptions' });

// Office associations
Office.belongsTo(Professional, { foreignKey: 'professionalId', as: 'professional' });
Office.hasMany(Schedule, { foreignKey: 'officeId', as: 'schedules' });
Office.hasMany(Appointment, { foreignKey: 'officeId', as: 'appointments' });

// Schedule associations
Schedule.belongsTo(Office, { foreignKey: 'officeId', as: 'office' });

// Many-to-many: Patient <-> Professional
Patient.belongsToMany(Professional, {
	through: PatientProfessional,
	foreignKey: 'patientId',
	as: 'professionals',
});

Professional.belongsToMany(Patient, {
	through: PatientProfessional,
	foreignKey: 'professionalId',
	as: 'patients',
});

// Appointment associations
Appointment.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
Appointment.belongsTo(Professional, { foreignKey: 'professionalId', as: 'professional' });
Appointment.belongsTo(Office, { foreignKey: 'officeId', as: 'office' });

// Other associations
HealthInfo.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
Prescription.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
Prescription.belongsTo(Professional, { foreignKey: 'professionalId', as: 'professional' });
Study.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

export {
	User,
	Patient,
	Professional,
	HealthInfo,
	Office,
	Schedule,
	Appointment,
	Prescription,
	Study,
	PatientProfessional,
};