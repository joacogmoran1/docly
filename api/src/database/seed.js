import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import sequelize from '../config/database.js';
import logger from '../utils/logger.js';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.join(CURRENT_DIR, 'seeds');
const META_TABLE = 'seed_migrations';

async function ensureMetaTable() {
	await sequelize.query(`
		CREATE TABLE IF NOT EXISTS ${META_TABLE} (
			name VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`);
}

async function getAppliedSeeds() {
	const rows = await sequelize.query(
		`SELECT name FROM ${META_TABLE} ORDER BY name ASC`,
		{ type: sequelize.QueryTypes.SELECT }
	);

	return new Set(rows.map((row) => row.name));
}

async function run() {
	await sequelize.authenticate();
	await ensureMetaTable();

	let entries = [];
	try {
		entries = await fs.readdir(SEEDS_DIR);
	} catch {
		logger.info({ message: 'No hay seeds para aplicar.' });
		await sequelize.close();
		return;
	}

	const appliedSeeds = await getAppliedSeeds();
	const seedFiles = entries.filter((entry) => entry.endsWith('.js')).sort();

	for (const fileName of seedFiles) {
		if (appliedSeeds.has(fileName)) {
			continue;
		}

		const filePath = path.join(SEEDS_DIR, fileName);
		const seedModule = await import(pathToFileURL(filePath).href);
		const seed = seedModule.default;
		const transaction = await sequelize.transaction();

		try {
			await seed.up({ sequelize, transaction });
			await sequelize.query(
				`INSERT INTO ${META_TABLE} (name, applied_at) VALUES (:name, NOW())`,
				{
					replacements: { name: fileName },
					type: sequelize.QueryTypes.INSERT,
					transaction,
				}
			);
			await transaction.commit();
			logger.info({ message: 'Seed aplicado.', seed: fileName });
		} catch (error) {
			if (!transaction.finished) {
				await transaction.rollback();
			}
			logger.error({ message: 'Error aplicando seed.', seed: fileName, error });
			throw error;
		}
	}

	await sequelize.close();
}

void run();
