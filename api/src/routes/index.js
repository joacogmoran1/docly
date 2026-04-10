// src/routes/index.js
import express from 'express';
import authRoutes from './authRoutes.js';
import patientRoutes from './patientRoutes.js';
import professionalRoutes from './professionalRoutes.js';
import officeRoutes from './officeRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/professionals', professionalRoutes);
router.use('/offices', officeRoutes);
router.use('/appointments', appointmentRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
