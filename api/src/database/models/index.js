import User from './User.js';
import Patient from './Patient.js';
import Professional from './Professional.js';
import HealthInfo from './HealthInfo.js';
import Office from './Office.js';
import Schedule from './Schedule.js';
import OfficeBlock from './OfficeBlock.js';
import Appointment from './Appointment.js';
import Prescription from './Prescription.js';
import Study from './Study.js';
import MedicalRecord from './MedicalRecord.js';
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
Patient.hasMany(MedicalRecord, { foreignKey: 'patientId', as: 'medicalRecords' });

// Professional associations
Professional.hasMany(Office, { foreignKey: 'professionalId', as: 'offices' });
Professional.hasMany(Appointment, { foreignKey: 'professionalId', as: 'appointments' });
Professional.hasMany(Prescription, { foreignKey: 'professionalId', as: 'prescriptions' });
Professional.hasMany(MedicalRecord, { foreignKey: 'professionalId', as: 'medicalRecords' });

// Office associations
Office.belongsTo(Professional, { foreignKey: 'professionalId', as: 'professional' });
Office.hasMany(Schedule, { foreignKey: 'officeId', as: 'schedules' });
Office.hasMany(OfficeBlock, { foreignKey: 'officeId', as: 'blocks' });
Office.hasMany(Appointment, { foreignKey: 'officeId', as: 'appointments' });

// Schedule associations
Schedule.belongsTo(Office, { foreignKey: 'officeId', as: 'office' });

// OfficeBlock associations
OfficeBlock.belongsTo(Office, { foreignKey: 'officeId', as: 'office' });

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
Appointment.hasOne(MedicalRecord, { foreignKey: 'appointmentId', as: 'medicalRecord' });

// Other associations
HealthInfo.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

Prescription.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
Prescription.belongsTo(Professional, { foreignKey: 'professionalId', as: 'professional' });

Study.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
Study.belongsTo(Professional, { foreignKey: 'professionalId', as: 'professional' });

MedicalRecord.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
MedicalRecord.belongsTo(Professional, { foreignKey: 'professionalId', as: 'professional' });
MedicalRecord.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });

export {
	User,
	Patient,
	Professional,
	HealthInfo,
	Office,
	Schedule,
	OfficeBlock,
	Appointment,
	Prescription,
	Study,
	MedicalRecord,
	PatientProfessional,
};