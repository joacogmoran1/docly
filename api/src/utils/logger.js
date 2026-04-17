import winston from 'winston';
import env from '../config/env.js';

const transports = [new winston.transports.Console()];

if (env.logging.enableFileLogs) {
	transports.push(
		new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
		new winston.transports.File({ filename: 'logs/combined.log' })
	);
}

const logger = winston.createLogger({
	level: env.logging.level,
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.errors({ stack: true }),
		winston.format.json()
	),
	defaultMeta: {
		service: 'docly-api',
		env: env.nodeEnv,
	},
	transports,
});

export default logger;
