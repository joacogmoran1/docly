import env from '../../config/env.js';
import logger from '../../utils/logger.js';

function buildRedisConfig() {
	if (env.redis.url) {
		return {
			url: env.redis.url,
			socket: env.redis.tls ? { tls: true } : undefined,
		};
	}

	if (!env.redis.host) {
		throw new Error('RATE_LIMIT_STORE=redis requiere REDIS_URL o REDIS_HOST configurado.');
	}

	return {
		username: env.redis.username || undefined,
		password: env.redis.password || undefined,
		database: env.redis.db,
		socket: {
			host: env.redis.host,
			port: env.redis.port,
			tls: env.redis.tls,
		},
	};
}

export class RedisRateLimitStore {
	constructor({ keyPrefix = env.rateLimit.redisKeyPrefix } = {}) {
		this.windowMs = 60 * 1000;
		this.keyPrefix = keyPrefix;
		this.clientPromise = null;
		this.memoryStore = new Map();
		this.warnedAboutFallback = false;
	}

	init(options) {
		this.windowMs = options.windowMs;
	}

	async connect() {
		try {
			await this.getClient();
		} catch (error) {
			if (!this.shouldFallbackToMemory(error)) {
				throw error;
			}
		}
	}

	async increment(key) {
		const now = new Date();
		const resetTime = new Date(now.getTime() + this.windowMs);

		try {
			const client = await this.getClient();
			const redisKey = this.formatKey(key);
			const totalHits = Number(await client.incr(redisKey));
			let ttlMs = Number(await client.pTTL(redisKey));

			if (ttlMs < 0) {
				await client.pExpire(redisKey, this.windowMs);
				ttlMs = this.windowMs;
			}

			return {
				totalHits,
				resetTime: new Date(Date.now() + ttlMs),
			};
		} catch (error) {
			if (!this.shouldFallbackToMemory(error)) {
				throw error;
			}

			return this.incrementInMemory(key, now, resetTime);
		}
	}

	async decrement(key) {
		try {
			const client = await this.getClient();
			const redisKey = this.formatKey(key);
			const totalHits = Number(await client.decr(redisKey));

			if (totalHits <= 0) {
				await client.del(redisKey);
			}
		} catch (error) {
			if (this.shouldFallbackToMemory(error)) {
				const entry = this.memoryStore.get(key);
				if (entry) {
					entry.totalHits = Math.max(entry.totalHits - 1, 0);
				}
				return;
			}
			throw error;
		}
	}

	async resetKey(key) {
		try {
			const client = await this.getClient();
			await client.del(this.formatKey(key));
		} catch (error) {
			if (this.shouldFallbackToMemory(error)) {
				this.memoryStore.delete(key);
				return;
			}
			throw error;
		}
	}

	async cleanup() {
		return 0;
	}

	async shutdown() {
		if (!this.clientPromise) {
			return;
		}

		const client = await this.clientPromise.catch(() => null);
		this.clientPromise = null;

		if (client?.isOpen) {
			await client.quit();
		}
	}

	formatKey(key) {
		return `${this.keyPrefix}${key}`;
	}

	incrementInMemory(key, now, resetTime) {
		const current = this.memoryStore.get(key);
		if (!current || current.resetTime <= now) {
			const entry = { totalHits: 1, resetTime };
			this.memoryStore.set(key, entry);
			return entry;
		}

		current.totalHits += 1;
		return current;
	}

	async getClient() {
		if (!this.clientPromise) {
			this.clientPromise = this.createAndConnectClient().catch((error) => {
				this.clientPromise = null;
				throw error;
			});
		}

		return this.clientPromise;
	}

	async createAndConnectClient() {
		let redisModule;

		try {
			redisModule = await import('redis');
		} catch (error) {
			throw new Error('RATE_LIMIT_STORE=redis requiere instalar la dependencia "redis".', {
				cause: error,
			});
		}

		const client = redisModule.createClient(buildRedisConfig());
		client.on('error', (error) => {
			logger.error({ message: 'Error en cliente Redis para rate limit.', error });
		});

		if (!client.isOpen) {
			await client.connect();
		}

		return client;
	}

	shouldFallbackToMemory(error) {
		const code = error?.code || error?.cause?.code || error?.original?.code;
		const message = String(error?.message || error?.cause?.message || '').toLowerCase();
		const recoverable =
			code === 'ECONNREFUSED' ||
			code === 'ECONNRESET' ||
			code === 'ENOTFOUND' ||
			code === 'EAI_AGAIN' ||
			code === 'ETIMEDOUT' ||
			message.includes('rate_limit_store=redis requiere instalar la dependencia') ||
			message.includes('socket closed unexpectedly');

		if (recoverable && !this.warnedAboutFallback) {
			this.warnedAboutFallback = true;
			logger.warn({
				message: 'Rate limit store en memoria: Redis no está disponible o no está instalado.',
			});
		}

		return recoverable;
	}
}
