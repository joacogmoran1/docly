import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import sequelize from '../config/database.js';
import logger from '../utils/logger.js';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(CURRENT_DIR, 'migrations');
const META_TABLE = 'schema_migrations';

async function ensureMetaTable() {
	await sequelize.query(`
		CREATE TABLE IF NOT EXISTS ${META_TABLE} (
			name VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`);
}

async function getAppliedMigrations() {
	const rows = await sequelize.query(
		`SELECT name FROM ${META_TABLE} ORDER BY name ASC`,
		{ type: sequelize.QueryTypes.SELECT }
	);

	return new Set(rows.map((row) => row.name));
}

async function loadMigrationFiles() {
	const entries = await fs.readdir(MIGRATIONS_DIR);
	return entries
		.filter((entry) => entry.endsWith('.js'))
		.sort((left, right) => left.localeCompare(right));
}

async function importMigration(fileName) {
	const filePath = path.join(MIGRATIONS_DIR, fileName);
	return import(pathToFileURL(filePath).href);
}

async function run() {
	await sequelize.authenticate();
	await ensureMetaTable();

	const appliedMigrations = await getAppliedMigrations();
	const files = await loadMigrationFiles();

	for (const fileName of files) {
		if (appliedMigrations.has(fileName)) {
			continue;
		}

		const migrationModule = await importMigration(fileName);
		const migration = migrationModule.default;
		const transaction = await sequelize.transaction();

		try {
			await migration.up({ sequelize, transaction });
			await sequelize.query(
				`INSERT INTO ${META_TABLE} (name, applied_at) VALUES (:name, NOW())`,
				{
					replacements: { name: fileName },
					type: sequelize.QueryTypes.INSERT,
					transaction,
				}
			);
			await transaction.commit();
			logger.info({ message: 'Migración aplicada.', migration: fileName });
		} catch (error) {
			if (!transaction.finished) {
				await transaction.rollback();
			}
			logger.error({ message: 'Error aplicando migración.', migration: fileName, error });
			throw error;
		}
	}

	await sequelize.close();
}

void run();
