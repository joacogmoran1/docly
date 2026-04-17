import express from 'express';
import sequelize from '../config/database.js';
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

router.get('/health/live', (req, res) => {
	res.status(200).json({
		success: true,
		status: 'live',
		timestamp: new Date().toISOString(),
	});
});

router.get('/health/ready', async (req, res) => {
	if (req.app.locals.isShuttingDown || !req.app.locals.isReady) {
		return res.status(503).json({
			success: false,
			status: 'not-ready',
			timestamp: new Date().toISOString(),
		});
	}

	try {
		await sequelize.query('SELECT 1', { type: sequelize.QueryTypes.SELECT });
		return res.status(200).json({
			success: true,
			status: 'ready',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		return res.status(503).json({
			success: false,
			status: 'db-unavailable',
			timestamp: new Date().toISOString(),
		});
	}
});

router.get('/health', async (req, res) => {
	if (req.app.locals.isShuttingDown || !req.app.locals.isReady) {
		return res.status(503).json({
			success: false,
			status: 'degraded',
			timestamp: new Date().toISOString(),
		});
	}

	try {
		await sequelize.query('SELECT 1', { type: sequelize.QueryTypes.SELECT });
		return res.status(200).json({
			success: true,
			status: 'ok',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		return res.status(503).json({
			success: false,
			status: 'db-unavailable',
			timestamp: new Date().toISOString(),
		});
	}
});

export default router;
