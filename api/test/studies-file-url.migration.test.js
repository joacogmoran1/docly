import test from 'node:test';
import assert from 'node:assert/strict';

import migration from '../src/database/migrations/002-alter-studies-file-url-text.js';

test('migration 002 up altera studies.file_url a TEXT usando la transaccion recibida', async () => {
	let queryCall = null;
	const transaction = { id: 'tx-up' };

	await migration.up({
		sequelize: {
			async query(sql, options) {
				queryCall = { sql, options };
			},
		},
		transaction,
	});

	assert.ok(queryCall, 'Se esperaba una llamada a sequelize.query');
	assert.match(queryCall.sql, /ALTER TABLE studies/i);
	assert.match(queryCall.sql, /ALTER COLUMN file_url TYPE TEXT/i);
	assert.equal(queryCall.options.transaction, transaction);
});

test('migration 002 down restaura studies.file_url a VARCHAR(255) truncando con LEFT', async () => {
	let queryCall = null;
	const transaction = { id: 'tx-down' };

	await migration.down({
		sequelize: {
			async query(sql, options) {
				queryCall = { sql, options };
			},
		},
		transaction,
	});

	assert.ok(queryCall, 'Se esperaba una llamada a sequelize.query');
	assert.match(queryCall.sql, /ALTER TABLE studies/i);
	assert.match(queryCall.sql, /ALTER COLUMN file_url TYPE VARCHAR\(255\)/i);
	assert.match(queryCall.sql, /USING LEFT\(file_url, 255\)/i);
	assert.equal(queryCall.options.transaction, transaction);
});
