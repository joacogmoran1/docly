import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import env from './config/env.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { csrfProtection } from './middleware/csrf.js';
import { attachRequestId } from './middleware/requestId.js';
import logger from './utils/logger.js';
import ApiError from './utils/ApiError.js';

import './database/models/index.js';

function isAllowedOrigin(origin) {
	if (!origin) {
		return true;
	}

	return env.cors.allowedOrigins.includes(origin);
}

function buildMorganStream() {
	return {
		write(message) {
			logger.info({
				type: 'http',
				message: message.trim(),
			});
		},
	};
}

export function createApp() {
	const app = express();
	morgan.token('request-id', (req) => req.id);

	app.set('trust proxy', env.trustProxy);
	app.locals.isReady = false;
	app.locals.isShuttingDown = false;

	app.use(attachRequestId);
	app.use(helmet());
	app.use(
		cors({
			origin(origin, callback) {
				if (isAllowedOrigin(origin)) {
					return callback(null, true);
				}

				return callback(new ApiError(403, 'Origen no permitido por CORS.'));
			},
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
			allowedHeaders: ['Content-Type', 'Authorization', env.security.csrfHeaderName, 'X-Requested-With'],
		})
	);
	app.use('/api', apiLimiter);
	app.use(express.json({ limit: env.bodyLimit }));
	app.use(express.urlencoded({ extended: true, limit: env.bodyLimit }));
	app.use(cookieParser());
	app.use(
		morgan(
			env.nodeEnv === 'development'
				? 'dev'
				: ':remote-addr - :request-id ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
			{
				stream: buildMorganStream(),
			}
		)
	);
	app.use('/api', csrfProtection, routes);

	app.all('*', (req, res, next) => {
		next(new ApiError(404, `No se encontró la ruta: ${req.originalUrl}`));
	});

	app.use(errorHandler);

	return app;
}

export default createApp();
