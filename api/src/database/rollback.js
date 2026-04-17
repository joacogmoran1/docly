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

async function getAppliedMigrations(limit = 1) {
	return sequelize.query(
		`SELECT name FROM ${META_TABLE} ORDER BY applied_at DESC, name DESC LIMIT :limit`,
		{
			replacements: { limit },
			type: sequelize.QueryTypes.SELECT,
		}
	);
}

async function importMigration(fileName) {
	const filePath = path.join(MIGRATIONS_DIR, fileName);
	return import(pathToFileURL(filePath).href);
}

async function run() {
	const steps = Number.parseInt(process.argv[2] || '1', 10);
	await sequelize.authenticate();
	await ensureMetaTable();

	const appliedMigrations = await getAppliedMigrations(steps);

	for (const migrationRow of appliedMigrations) {
		const fileName = migrationRow.name;
		const migrationModule = await importMigration(fileName);
		const migration = migrationModule.default;
		const transaction = await sequelize.transaction();

		try {
			await migration.down({ sequelize, transaction });
			await sequelize.query(
				`DELETE FROM ${META_TABLE} WHERE name = :name`,
				{
					replacements: { name: fileName },
					type: sequelize.QueryTypes.DELETE,
					transaction,
				}
			);
			await transaction.commit();
			logger.info({ message: 'Migración revertida.', migration: fileName });
		} catch (error) {
			if (!transaction.finished) {
				await transaction.rollback();
			}
			logger.error({ message: 'Error revirtiendo migración.', migration: fileName, error });
			throw error;
		}
	}

	await sequelize.close();
}

void run();
