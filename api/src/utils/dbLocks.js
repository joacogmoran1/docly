import sequelize from '../config/database.js';

export async function acquireTransactionLock(transaction, ...parts) {
	const lockKey = parts.map((part) => String(part)).join(':');

	await sequelize.query(
		'SELECT pg_advisory_xact_lock(hashtext(:lockKey));',
		{
			replacements: { lockKey },
			type: sequelize.QueryTypes.SELECT,
			transaction,
		}
	);
}
