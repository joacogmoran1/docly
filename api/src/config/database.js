import { Sequelize } from 'sequelize';
import env from './env.js';

const commonOptions = {
	dialect: 'postgres',
	logging: env.nodeEnv === 'development' ? console.log : false,
	pool: {
		max: env.db.poolMax,
		min: env.db.poolMin,
		acquire: env.db.poolAcquireMs,
		idle: env.db.poolIdleMs,
	},
	define: {
		timestamps: true,
		underscored: true,
	},
	...(env.db.ssl
		? {
				dialectOptions: {
					ssl: {
						require: true,
						rejectUnauthorized: env.db.sslRejectUnauthorized,
					},
				},
			}
		: {}),
};

const sequelize = env.db.url
	? new Sequelize(env.db.url, commonOptions)
	: new Sequelize(env.db.name, env.db.user, env.db.password, {
			...commonOptions,
			host: env.db.host,
			port: env.db.port,
		});

export default sequelize;
