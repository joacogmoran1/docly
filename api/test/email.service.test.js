import test from 'node:test';
import assert from 'node:assert/strict';

import nodemailer from 'nodemailer';

import env from '../src/config/env.js';
import logger from '../src/utils/logger.js';
import { stubMethod } from '../test-support/stub.js';

function freshEmailServiceModule() {
	return import(
		new URL(`../src/services/emailService.js?case=${Date.now()}-${Math.random()}`, import.meta.url)
	);
}

function snapshotEmailEnv() {
	return {
		nodeEnv: env.nodeEnv,
		corsOrigins: [...env.cors.allowedOrigins],
		email: { ...env.email },
	};
}

function restoreEmailEnv(snapshot) {
	env.nodeEnv = snapshot.nodeEnv;
	env.cors.allowedOrigins = snapshot.corsOrigins;
	Object.assign(env.email, snapshot.email);
}

test('EmailService.sendPasswordResetEmail usa Ethereal en desarrollo y arma el link de reset', async () => {
	const restores = [];
	const snapshot = snapshotEmailEnv();
	let transportConfig = null;
	let sentMessage = null;

	try {
		env.nodeEnv = 'development';
		env.cors.allowedOrigins = ['https://frontend.test'];
		env.email.host = null;
		env.email.port = 587;
		env.email.secure = false;
		env.email.user = null;
		env.email.pass = null;
		env.email.from = '"Docly QA" <qa@docly.test>';

		restores.push(stubMethod(logger, 'info', () => {}));
		restores.push(
			stubMethod(nodemailer, 'createTestAccount', async () => ({
				user: 'ethereal-user',
				pass: 'ethereal-pass',
			}))
		);
		restores.push(
			stubMethod(nodemailer, 'createTransport', config => {
				transportConfig = config;
				return {
					sendMail: async message => {
						sentMessage = message;
						return { messageId: 'msg-1' };
					},
				};
			})
		);
		restores.push(
			stubMethod(nodemailer, 'getTestMessageUrl', () => 'https://ethereal.test/message/1')
		);

		const { default: emailService } = await freshEmailServiceModule();
		const result = await emailService.sendPasswordResetEmail('ana@example.com', 'reset-token');

		assert.equal(transportConfig.host, 'smtp.ethereal.email');
		assert.equal(transportConfig.auth.user, 'ethereal-user');
		assert.equal(sentMessage.to, 'ana@example.com');
		assert.match(sentMessage.subject, /restablecer contrase/i);
		assert.match(sentMessage.text, /https:\/\/frontend\.test\/auth\/reset-password\?token=reset-token/);
		assert.match(sentMessage.html, /reset-password\?token=reset-token/);
		assert.deepEqual(result, {
			messageId: 'msg-1',
			previewUrl: 'https://ethereal.test/message/1',
		});
	} finally {
		restoreEmailEnv(snapshot);
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});

test('EmailService.sendAccountDeletedNotification usa SMTP configurado cuando existe host', async () => {
	const restores = [];
	const snapshot = snapshotEmailEnv();
	let createTestAccountCalled = false;
	let transportConfig = null;
	let sentMessage = null;

	try {
		env.nodeEnv = 'development';
		env.email.host = 'smtp.example.test';
		env.email.port = 2525;
		env.email.secure = true;
		env.email.user = 'smtp-user';
		env.email.pass = 'smtp-pass';
		env.email.from = '"Docly QA" <qa@docly.test>';

		restores.push(stubMethod(logger, 'info', () => {}));
		restores.push(
			stubMethod(nodemailer, 'createTestAccount', async () => {
				createTestAccountCalled = true;
				return { user: 'unused', pass: 'unused' };
			})
		);
		restores.push(
			stubMethod(nodemailer, 'createTransport', config => {
				transportConfig = config;
				return {
					sendMail: async message => {
						sentMessage = message;
						return { messageId: 'msg-2' };
					},
				};
			})
		);
		restores.push(stubMethod(nodemailer, 'getTestMessageUrl', () => null));

		const { default: emailService } = await freshEmailServiceModule();
		const result = await emailService.sendAccountDeletedNotification('bye@example.com');

		assert.equal(createTestAccountCalled, false);
		assert.deepEqual(transportConfig, {
			host: 'smtp.example.test',
			port: 2525,
			secure: true,
			auth: {
				user: 'smtp-user',
				pass: 'smtp-pass',
			},
		});
		assert.equal(sentMessage.to, 'bye@example.com');
		assert.match(sentMessage.subject, /cuenta eliminada/i);
		assert.match(sentMessage.text, /desactivada exitosamente/i);
		assert.deepEqual(result, {
			messageId: 'msg-2',
			previewUrl: null,
		});
	} finally {
		restoreEmailEnv(snapshot);
		for (const restore of restores.reverse()) {
			restore();
		}
	}
});
