import app from './app.js';
import sequelize from './config/database.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import emailService from './services/emailService.js';
import maintenanceService from './services/maintenanceService.js';
import {
	shutdownRateLimitStores,
	warmUpRateLimitStores,
} from './middleware/stores/rateLimitStoreFactory.js';

const PORT = env.port;

let server;

async function startServer() {
	try {
		await sequelize.authenticate();
		await warmUpRateLimitStores();
		await emailService.assertProductionReadiness();
		maintenanceService.start();
		app.locals.isReady = true;
		logger.info({ message: 'Base de datos conectada correctamente.' });

		server = app.listen(PORT, () => {
			logger.info({
				message: 'Servidor iniciado.',
				port: PORT,
				nodeEnv: env.nodeEnv,
				allowedOrigins: env.cors.allowedOrigins,
			});
		});
	} catch (error) {
		maintenanceService.stop();
		await shutdownRateLimitStores().catch(() => {});
		logger.error({ message: 'Error al iniciar el servidor.', error });
		process.exit(1);
	}
}

async function shutdown(signal) {
	if (app.locals.isShuttingDown) {
		return;
	}

	app.locals.isShuttingDown = true;
	app.locals.isReady = false;

	logger.warn({ message: `Recibida señal ${signal}. Cerrando servidor...` });

	const forceExitTimer = setTimeout(() => {
		logger.error({ message: 'Cierre forzado por timeout.' });
		process.exit(1);
	}, 10000);
	forceExitTimer.unref();

	try {
		if (server) {
			await new Promise((resolve, reject) => {
				server.close((error) => {
					if (error) {
						return reject(error);
					}
					return resolve();
				});
			});
		}

		maintenanceService.stop();
		await shutdownRateLimitStores();
		await sequelize.close();
		logger.info({ message: 'Servidor detenido correctamente.' });
		process.exit(0);
	} catch (error) {
		maintenanceService.stop();
		logger.error({ message: 'Error al cerrar el servidor.', error });
		process.exit(1);
	}
}

process.on('SIGTERM', () => {
	void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
	void shutdown('SIGINT');
});

process.on('unhandledRejection', (error) => {
	logger.error({ message: 'UNHANDLED REJECTION. Apagando servidor...', error });
	void shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
	logger.error({ message: 'UNCAUGHT EXCEPTION. Apagando servidor...', error });
	void shutdown('uncaughtException');
});

void startServer();
