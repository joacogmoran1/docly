import express from 'express';
import authRoutes from './authRoutes.js';
import patientRoutes from './patientRoutes.js';
import professionalRoutes from './professionalRoutes.js';
import officeRoutes from './officeRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';
import prescriptionRoutes from './prescriptionRoutes.js';
import studyRoutes from './studyRoutes.js';
import medicalRecordRoutes from './medicalRecordRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/professionals', professionalRoutes);
router.use('/offices', officeRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/studies', studyRoutes);
router.use('/medical-records', medicalRecordRoutes);

// Health check
router.get('/health', (req, res) => {
	res.status(200).json({
		success: true,
		message: 'Server is running',
		timestamp: new Date().toISOString(),
	});
});

export default router;
