import env from '../config/env.js';
import PasswordResetToken from '../database/models/PasswordResetToken.js';
import { RefreshToken } from '../database/models/index.js';
import { cleanupRateLimitStores } from '../middleware/stores/rateLimitStoreFactory.js';
import logger from '../utils/logger.js';

function buildDefaultCleaners() {
	return [
		{
			name: 'password-reset-tokens',
			run: () => PasswordResetToken.cleanup(),
		},
		{
			name: 'refresh-tokens',
			run: () => RefreshToken.cleanup(),
		},
		{
			name: 'rate-limit-hits',
			run: () => cleanupRateLimitStores(),
		},
	];
}

export class MaintenanceService {
	constructor({
		enabled = env.maintenance.enabled,
		runOnStartup = env.maintenance.runOnStartup,
		intervalMs = env.maintenance.cleanupIntervalMs,
		cleaners = buildDefaultCleaners(),
		loggerInstance = logger,
	} = {}) {
		this.enabled = enabled;
		this.runOnStartup = runOnStartup;
		this.intervalMs = intervalMs;
		this.cleaners = cleaners;
		this.logger = loggerInstance;
		this.timer = null;
		this.currentRun = null;
	}

	start() {
		if (!this.enabled || this.timer) {
			return false;
		}

		if (this.runOnStartup) {
			void this.runCleanup('startup');
		}

		this.timer = setInterval(() => {
			void this.runCleanup('interval');
		}, this.intervalMs);
		this.timer.unref?.();

		this.logger.info({
			message: 'Mantenimiento programado inicializado.',
			intervalMs: this.intervalMs,
		});

		return true;
	}

	stop() {
		if (!this.timer) {
			return false;
		}

		clearInterval(this.timer);
		this.timer = null;
		return true;
	}

	runCleanup(trigger = 'manual') {
		if (this.currentRun) {
			return this.currentRun;
		}

		this.currentRun = this.executeCleanup(trigger).finally(() => {
			this.currentRun = null;
		});

		return this.currentRun;
	}

	async executeCleanup(trigger) {
		const startedAt = Date.now();
		const tasks = await Promise.all(
			this.cleaners.map(async (cleaner) => {
				try {
					const deletedCount = Number(await cleaner.run());
					return {
						name: cleaner.name,
						status: 'fulfilled',
						deletedCount,
					};
				} catch (error) {
					this.logger.error({
						message: 'Error en mantenimiento programado.',
						task: cleaner.name,
						trigger,
						error,
					});
					return {
						name: cleaner.name,
						status: 'rejected',
						deletedCount: 0,
						error,
					};
				}
			})
		);

		const deletedCount = tasks.reduce((sum, task) => sum + task.deletedCount, 0);
		const durationMs = Date.now() - startedAt;

		this.logger.info({
			message: 'Mantenimiento programado ejecutado.',
			trigger,
			durationMs,
			deletedCount,
			tasks: tasks.map(({ name, status, deletedCount: taskDeletedCount }) => ({
				name,
				status,
				deletedCount: taskDeletedCount,
			})),
		});

		return {
			trigger,
			durationMs,
			deletedCount,
			tasks,
		};
	}
}

const maintenanceService = new MaintenanceService();

export default maintenanceService;
