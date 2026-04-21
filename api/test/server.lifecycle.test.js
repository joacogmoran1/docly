import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SERVER_PATH = path.resolve('C:/Users/joaco/Desktop/Proyectos/docly/api/src/server.js');

function createProcessDouble() {
	return {
		handlers: new Map(),
		exitCode: null,
		on(event, handler) {
			this.handlers.set(event, handler);
		},
		exit(code) {
			this.exitCode = code;
		},
	};
}

function createLoggerDouble() {
	return {
		infoCalls: [],
		warnCalls: [],
		errorCalls: [],
		info(payload) {
			this.infoCalls.push(payload);
		},
		warn(payload) {
			this.warnCalls.push(payload);
		},
		error(payload) {
			this.errorCalls.push(payload);
		},
	};
}

function createSetTimeoutDouble() {
	const calls = [];

	function fakeSetTimeout(callback, delay) {
		const timer = {
			callback,
			delay,
			unrefCalled: false,
			unref() {
				this.unrefCalled = true;
			},
		};
		calls.push(timer);
		return timer;
	}

	return {
		calls,
		fakeSetTimeout,
	};
}

function loadServerHarness(overrides = {}) {
	const source = fs
		.readFileSync(SERVER_PATH, 'utf8')
		.replace(/^import[\s\S]*?;\r?\n/gm, '')
		.replace('void startServer();', '')
		.concat('\nreturn { startServer, shutdown, getServer: () => server, app };');

	const factory = new Function(
		'app',
		'sequelize',
		'env',
		'logger',
		'maintenanceService',
		'shutdownRateLimitStores',
		'warmUpRateLimitStores',
		'process',
		'setTimeout',
		source
	);

	const app = overrides.app || {
		locals: { isReady: false, isShuttingDown: false },
		listenCalls: [],
		listen(port, callback) {
			this.listenCalls.push(port);
			const server = overrides.server || {
				close(handler) {
					handler?.();
				},
			};
			callback?.();
			return server;
		},
	};
	const sequelize = overrides.sequelize || {
		async authenticate() {},
		async close() {},
	};
	const env = overrides.env || {
		port: 4000,
		nodeEnv: 'test',
		cors: { allowedOrigins: ['http://localhost:3000'] },
	};
	const logger = overrides.logger || createLoggerDouble();
	const maintenanceService = overrides.maintenanceService || {
		startCalls: 0,
		stopCalls: 0,
		start() {
			this.startCalls += 1;
		},
		stop() {
			this.stopCalls += 1;
		},
	};
	const shutdownRateLimitStores = overrides.shutdownRateLimitStores || (async () => {});
	const warmUpRateLimitStores = overrides.warmUpRateLimitStores || (async () => {});
	const processDouble = overrides.process || createProcessDouble();
	const timeoutDouble = overrides.timeoutDouble || createSetTimeoutDouble();

	const harness = factory(
		app,
		sequelize,
		env,
		logger,
		maintenanceService,
		shutdownRateLimitStores,
		warmUpRateLimitStores,
		processDouble,
		timeoutDouble.fakeSetTimeout
	);

	return {
		...harness,
		app,
		sequelize,
		env,
		logger,
		maintenanceService,
		processDouble,
		timeoutDouble,
	};
}

test('server.js inicia la aplicacion, calienta stores y arranca a escuchar', async () => {
	const logger = createLoggerDouble();
	const processDouble = createProcessDouble();
	let authenticateCalls = 0;
	let warmUpCalls = 0;
	let listenPort = null;

	const harness = loadServerHarness({
		logger,
		process: processDouble,
		sequelize: {
			async authenticate() {
				authenticateCalls += 1;
			},
			async close() {},
		},
		warmUpRateLimitStores: async () => {
			warmUpCalls += 1;
		},
		app: {
			locals: { isReady: false, isShuttingDown: false },
			listen(port, callback) {
				listenPort = port;
				callback?.();
				return {
					close(handler) {
						handler?.();
					},
				};
			},
		},
		env: {
			port: 4321,
			nodeEnv: 'test',
			cors: { allowedOrigins: ['http://localhost:3000'] },
		},
	});

	await harness.startServer();

	assert.equal(authenticateCalls, 1);
	assert.equal(warmUpCalls, 1);
	assert.equal(harness.maintenanceService.startCalls, 1);
	assert.equal(harness.app.locals.isReady, true);
	assert.equal(listenPort, 4321);
	assert.ok(processDouble.handlers.has('SIGTERM'));
	assert.ok(processDouble.handlers.has('SIGINT'));
	assert.ok(processDouble.handlers.has('unhandledRejection'));
	assert.ok(processDouble.handlers.has('uncaughtException'));
	assert.ok(
		logger.infoCalls.some((payload) => payload.message === 'Servidor iniciado.'),
		'Se esperaba el log de servidor iniciado'
	);
});

test('server.js apaga servidor, stores y sequelize de forma ordenada', async () => {
	const logger = createLoggerDouble();
	const processDouble = createProcessDouble();
	let shutdownStoresCalls = 0;
	let closeCalls = 0;
	let serverCloseCalls = 0;

	const harness = loadServerHarness({
		logger,
		process: processDouble,
		shutdownRateLimitStores: async () => {
			shutdownStoresCalls += 1;
		},
		sequelize: {
			async authenticate() {},
			async close() {
				closeCalls += 1;
			},
		},
		server: {
			close(handler) {
				serverCloseCalls += 1;
				handler?.();
			},
		},
	});

	await harness.startServer();
	await harness.shutdown('SIGTERM');

	assert.equal(harness.app.locals.isReady, false);
	assert.equal(harness.app.locals.isShuttingDown, true);
	assert.equal(serverCloseCalls, 1);
	assert.equal(harness.maintenanceService.stopCalls, 1);
	assert.equal(shutdownStoresCalls, 1);
	assert.equal(closeCalls, 1);
	assert.equal(processDouble.exitCode, 0);
	assert.equal(harness.timeoutDouble.calls.length, 1);
	assert.equal(harness.timeoutDouble.calls[0].unrefCalled, true);
	assert.ok(
		logger.warnCalls.some((payload) => /SIGTERM/.test(payload.message)),
		'Se esperaba el warning de shutdown'
	);
});

test('server.js limpia recursos y sale con error si falla el arranque', async () => {
	const logger = createLoggerDouble();
	const processDouble = createProcessDouble();
	let shutdownStoresCalls = 0;

	const harness = loadServerHarness({
		logger,
		process: processDouble,
		sequelize: {
			async authenticate() {
				throw new Error('db down');
			},
			async close() {},
		},
		shutdownRateLimitStores: async () => {
			shutdownStoresCalls += 1;
		},
	});

	await harness.startServer();

	assert.equal(harness.maintenanceService.stopCalls, 1);
	assert.equal(shutdownStoresCalls, 1);
	assert.equal(processDouble.exitCode, 1);
	assert.ok(
		logger.errorCalls.some((payload) => payload.message === 'Error al iniciar el servidor.'),
		'Se esperaba el log de error de arranque'
	);
});
