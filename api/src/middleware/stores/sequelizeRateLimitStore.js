import sequelize from '../../config/database.js';
import env from '../../config/env.js';

export async function cleanupSequelizeRateLimitHits({
	now = new Date(),
	staleEntryMs = env.rateLimit.staleEntryMs,
} = {}) {
	const cutoff = new Date(now.getTime() - staleEntryMs);
	const [result] = await sequelize.query(
		`
		WITH deleted AS (
			DELETE FROM rate_limit_hits
			WHERE reset_at < :cutoff
			RETURNING 1
		)
		SELECT COUNT(*)::int AS deleted_count FROM deleted
		`,
		{
			replacements: { cutoff },
			type: sequelize.QueryTypes.SELECT,
		}
	);

	return Number(result?.deleted_count || 0);
}

export class SequelizeRateLimitStore {
	constructor({ staleEntryMs = env.rateLimit.staleEntryMs } = {}) {
		this.windowMs = 60 * 1000;
		this.staleEntryMs = staleEntryMs;
		this.memoryStore = new Map();
		this.warnedAboutFallback = false;
	}

	init(options) {
		this.windowMs = options.windowMs;
	}

	async increment(key) {
		const now = new Date();
		const resetTime = new Date(now.getTime() + this.windowMs);

		try {
			const [result] = await sequelize.query(
				`
				INSERT INTO rate_limit_hits ("key", hits, reset_at, created_at, updated_at)
				VALUES (:key, 1, :resetTime, :now, :now)
				ON CONFLICT ("key")
				DO UPDATE SET
					hits = CASE
						WHEN rate_limit_hits.reset_at <= :now THEN 1
						ELSE rate_limit_hits.hits + 1
					END,
					reset_at = CASE
						WHEN rate_limit_hits.reset_at <= :now THEN :resetTime
						ELSE rate_limit_hits.reset_at
					END,
					updated_at = :now
				RETURNING hits, reset_at AS "resetTime";
				`,
				{
					replacements: { key, now, resetTime },
					type: sequelize.QueryTypes.SELECT,
				}
			);

			return {
				totalHits: Number(result.hits),
				resetTime: result.resetTime,
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
			await sequelize.query(
				`
				UPDATE rate_limit_hits
				SET hits = GREATEST(hits - 1, 0),
					updated_at = NOW()
				WHERE "key" = :key
				`,
				{
					replacements: { key },
					type: sequelize.QueryTypes.UPDATE,
				}
			);
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
			await sequelize.query(
				'DELETE FROM rate_limit_hits WHERE "key" = :key',
				{
					replacements: { key },
					type: sequelize.QueryTypes.DELETE,
				}
			);
		} catch (error) {
			if (this.shouldFallbackToMemory(error)) {
				this.memoryStore.delete(key);
				return;
			}
			throw error;
		}
	}

	async cleanup(options = {}) {
		return cleanupSequelizeRateLimitHits({
			staleEntryMs: this.staleEntryMs,
			...options,
		});
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

	shouldFallbackToMemory(error) {
		const code = error?.original?.code || error?.code;
		const message = String(error?.message || '').toLowerCase();
		const recoverable =
			code === '42P01' ||
			code === 'ECONNREFUSED' ||
			message.includes('no existe la relación') ||
			message.includes('relation') && message.includes('does not exist');

		if (recoverable && !this.warnedAboutFallback) {
			this.warnedAboutFallback = true;
			console.warn('Rate limit store en memoria: la tabla compartida todavía no está disponible.');
		}

		return recoverable;
	}
}
