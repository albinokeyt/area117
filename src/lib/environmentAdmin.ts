import { createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import type { ServerUser } from './db';

export const ENVIRONMENT_ADMIN_ID = '__environment_admin__';

export function equalSecret(a: string, b: string) {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

// Runtime-only configuration. Never import this module into client components.
export function getEnvironmentAdmin(): { user: ServerUser; fingerprint: string } | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password?.trim()) return null;
  return {
    user: { id: ENVIRONMENT_ADMIN_ID, name: 'Administrador de emergencia', email: username,
      role: 'ADMIN', createdAt: '1970-01-01T00:00:00.000Z' },
    // Bind sessions to the configured credentials; rotation or disabling revokes them.
    fingerprint: scryptSync(password, `area117:environment-admin:${username.toLowerCase()}`, 32).toString('hex'),
  };
}

export function authenticateEnvironmentAdmin(username: string, password: string): ServerUser | null {
  const configuredUsername = process.env.ADMIN_USERNAME?.trim();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredUsername || !configuredPassword?.trim()) return null;
  const usernameMatches = equalSecret(username.trim().toLowerCase(), configuredUsername.toLowerCase());
  const passwordMatches = equalSecret(password, configuredPassword);
  return usernameMatches && passwordMatches ? getEnvironmentAdmin()!.user : null;
}
