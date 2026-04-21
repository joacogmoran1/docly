export default {
	async up({ sequelize, transaction }) {
		await sequelize.query(
			`
			ALTER TABLE studies
			ALTER COLUMN file_url TYPE TEXT;
			`,
			{ transaction }
		);
	},

	async down({ sequelize, transaction }) {
		await sequelize.query(
			`
			ALTER TABLE studies
			ALTER COLUMN file_url TYPE VARCHAR(255)
			USING LEFT(file_url, 255);
			`,
			{ transaction }
		);
	},
};
