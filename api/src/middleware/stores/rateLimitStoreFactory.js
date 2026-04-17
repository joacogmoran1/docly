import env from '../../config/env.js';
import { RedisRateLimitStore } from './redisRateLimitStore.js';
import {
	SequelizeRateLimitStore,
	cleanupSequelizeRateLimitHits,
} from './sequelizeRateLimitStore.js';

const activeStores = new Set();

function buildStore() {
	if (env.rateLimit.store === 'redis') {
		return new RedisRateLimitStore({
			keyPrefix: env.rateLimit.redisKeyPrefix,
		});
	}

	return new SequelizeRateLimitStore({
		staleEntryMs: env.rateLimit.staleEntryMs,
	});
}

export function createRateLimitStore() {
	const store = buildStore();
	activeStores.add(store);
	return store;
}

export async function warmUpRateLimitStores() {
	await Promise.all(
		Array.from(activeStores, async (store) => {
			if (typeof store.connect === 'function') {
				await store.connect();
			}
		})
	);
}

export async function cleanupRateLimitStores(options = {}) {
	if (env.rateLimit.store === 'redis') {
		return 0;
	}

	return cleanupSequelizeRateLimitHits(options);
}

export async function shutdownRateLimitStores() {
	await Promise.all(
		Array.from(activeStores, async (store) => {
			if (typeof store.shutdown === 'function') {
				await store.shutdown();
			}
		})
	);
}
