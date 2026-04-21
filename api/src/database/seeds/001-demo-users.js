import env from '../../config/env.js';
import { User, Patient, Professional } from '../../../../.claude/worktrees/recursing-poitras-c0578f/api/src/database/models/index.js';

export default {
	async up({ transaction }) {
		if (env.nodeEnv === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') {
			return;
		}

		const patientUser = await User.create(
			{
				email: 'paciente.demo@docly.local',
				password: 'Password123',
				name: 'Paciente',
				lastName: 'Demo',
				role: 'patient',
				acceptedTermsAt: new Date(),
			},
			{ transaction }
		);

		await Patient.create(
			{
				userId: patientUser.id,
				dni: '00000001',
			},
			{ transaction }
		);

		const professionalUser = await User.create(
			{
				email: 'profesional.demo@docly.local',
				password: 'Password123',
				name: 'Profesional',
				lastName: 'Demo',
				role: 'professional',
				acceptedTermsAt: new Date(),
			},
			{ transaction }
		);

		await Professional.create(
			{
				userId: professionalUser.id,
				specialty: 'Clínica médica',
				licenseNumber: 'DEMO-0001',
			},
			{ transaction }
		);
	},
};
