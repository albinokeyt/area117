import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authenticateEnvironmentAdmin, getEnvironmentAdmin, ENVIRONMENT_ADMIN_ID } from '../src/lib/environmentAdmin';

function withCredentials(username: string | undefined, password: string | undefined, check: () => void) {
  const originalUsername = process.env.ADMIN_USERNAME;
  const originalPassword = process.env.ADMIN_PASSWORD;
  try {
    if (username === undefined) delete process.env.ADMIN_USERNAME; else process.env.ADMIN_USERNAME = username;
    if (password === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = password;
    check();
  } finally {
    if (originalUsername === undefined) delete process.env.ADMIN_USERNAME; else process.env.ADMIN_USERNAME = originalUsername;
    if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = originalPassword;
  }
}

test('environment access is disabled unless both credentials are set', () => {
  for (const [username, password] of [[undefined, undefined], ['recovery', undefined], [undefined, 'secret'], [' ', 'secret'], ['recovery', ' ']]) {
    withCredentials(username, password, () => {
      assert.equal(getEnvironmentAdmin(), null);
      assert.equal(authenticateEnvironmentAdmin('recovery', 'secret'), null);
    });
  }
});

test('configured account is an independent admin and never returns its password', () => {
  withCredentials('Recovery', 'exact password', () => {
    const user = authenticateEnvironmentAdmin(' recovery ', 'exact password');
    assert.equal(user?.id, ENVIRONMENT_ADMIN_ID);
    assert.equal(user?.role, 'ADMIN');
    assert.equal(user?.password, undefined);
    assert.equal(authenticateEnvironmentAdmin('Recovery', 'wrong'), null);
    assert.equal(authenticateEnvironmentAdmin('other', 'exact password'), null);
    assert.equal(authenticateEnvironmentAdmin('Recovery', 'exact password '), null);
  });
});

test('rotating either credential changes the session fingerprint', () => {
  withCredentials('Recovery', 'first password', () => {
    const first = getEnvironmentAdmin()!.fingerprint;
    process.env.ADMIN_PASSWORD = 'second password';
    assert.notEqual(getEnvironmentAdmin()!.fingerprint, first);
    process.env.ADMIN_PASSWORD = 'first password';
    process.env.ADMIN_USERNAME = 'another recovery account';
    assert.notEqual(getEnvironmentAdmin()!.fingerprint, first);
  });
});
