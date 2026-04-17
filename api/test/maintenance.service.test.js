import test from 'node:test';
import assert from 'node:assert/strict';
import { MaintenanceService } from '../src/services/maintenanceService.js';

function createLogger() {
	return {
		info() {},
		error() {},
		warn() {},
	};
}

test('MaintenanceService suma resultados de limpieza', async () => {
	const service = new MaintenanceService({
		enabled: true,
		runOnStartup: false,
		intervalMs: 1000,
		loggerInstance: createLogger(),
		cleaners: [
			{ name: 'password-reset-tokens', run: async () => 2 },
			{ name: 'refresh-tokens', run: async () => 3 },
			{ name: 'rate-limit-hits', run: async () => 5 },
		],
	});

	const summary = await service.runCleanup('test');

	assert.equal(summary.trigger, 'test');
	assert.equal(summary.deletedCount, 10);
	assert.deepEqual(
		summary.tasks.map((task) => [task.name, task.status, task.deletedCount]),
		[
			['password-reset-tokens', 'fulfilled', 2],
			['refresh-tokens', 'fulfilled', 3],
			['rate-limit-hits', 'fulfilled', 5],
		]
	);
});

test('MaintenanceService no superpone ejecuciones concurrentes', async () => {
	let runs = 0;
	let releaseRun;

	const blockedRun = new Promise((resolve) => {
		releaseRun = resolve;
	});

	const service = new MaintenanceService({
		enabled: true,
		runOnStartup: false,
		intervalMs: 1000,
		loggerInstance: createLogger(),
		cleaners: [
			{
				name: 'slow-cleaner',
				run: async () => {
					runs += 1;
					await blockedRun;
					return 1;
				},
			},
		],
	});

	const firstRun = service.runCleanup('first');
	const secondRun = service.runCleanup('second');

	assert.equal(firstRun, secondRun);

	releaseRun();
	const summary = await firstRun;

	assert.equal(summary.deletedCount, 1);
	assert.equal(runs, 1);
});
