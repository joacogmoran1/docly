import test from 'node:test';
import assert from 'node:assert/strict';
import csrfService from '../src/services/csrfService.js';

test('csrfService genera y valida tokens firmados', () => {
	const token = csrfService.generateToken();

	assert.equal(typeof token, 'string');
	assert.ok(token.includes('.'));
	assert.equal(csrfService.verifyToken(token), true);
});

test('csrfService rechaza tokens adulterados', () => {
	const token = csrfService.generateToken();
	const tamperedToken = `${token}tampered`;

	assert.equal(csrfService.verifyToken(tamperedToken), false);
});
