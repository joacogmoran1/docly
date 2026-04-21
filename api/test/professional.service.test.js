import test from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';

import professionalService from '../src/services/professionalService.js';
import officeBlockService from '../src/services/officeBlockService.js';
import { Appointment } from '../src/database/models/index.js';
import { stubMethod } from '../test-support/stub.js';

function formatDate(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test('ProfessionalService._calculateNextAvailable mantiene ocupados los completed futuros', async () => {
	const restores = [];
	const today = new Date();
	const maxDate = new Date(today);
	maxDate.setDate(maxDate.getDate() + 30);
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);

	const office = {
		id: 'office-1',
		appointmentDuration: 30,
		schedules: [
			{
				isActive: true,
				dayOfWeek: tomorrow.getDay(),
				startTime: '09:00:00',
				endTime: '10:00:00',
			},
		],
	};

	try {
		restores.push(
			stubMethod(Appointment, 'findAll', async ({ where }) => {
				assert.equal(where.professionalId, 'professional-1');
				assert.deepEqual(where.date, { [Op.between]: [formatDate(today), formatDate(maxDate)] });
				assert.equal(where[Op.or]?.length, 2);
				assert.deepEqual(where[Op.or][0], { status: { [Op.in]: ['pending', 'confirmed'] } });
				assert.equal(where[Op.or][1].status, 'completed');
				assert.equal(where[Op.or][1][Op.or]?.length, 2);

				return [
					{
						officeId: 'office-1',
						date: formatDate(tomorrow),
						time: '09:00:00',
						duration: 30,
					},
				];
			})
		);
		restores.push(stubMethod(officeBlockService, 'getByProfessional', async () => []));

		const nextAvailable = await professionalService._calculateNextAvailable('professional-1', [office]);

		assert.equal(nextAvailable, `${formatDate(tomorrow)}T09:30:00`);
	} finally {
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});
