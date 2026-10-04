import { RuntimeConfigError } from './runtime-config.js';

export type StartupStage = 'configuration' | 'initialization' | 'listen';

const safeCodes: Record<string, string> = {
  EADDRINUSE: 'The configured PORT is already in use.',
  EACCES: 'The process cannot bind the configured PORT.',
  ECONNREFUSED: 'A required network connection was refused.',
  ETIMEDOUT: 'A required network connection timed out.',
  ENOTFOUND: 'A required hostname could not be resolved.',
  P1000: 'Database authentication failed. Verify DATABASE_URL in the host secret manager.',
  P1001: 'The database server could not be reached.',
  P1002: 'The database connection timed out.',
  P1011: 'The database TLS connection failed.',
};

export function startupDiagnostic(error: unknown, stage: StartupStage): string {
  const prefix = 'API startup failed [' + stage + ']. ';
  if (error instanceof RuntimeConfigError) return prefix + error.message;
  if (error && typeof error === 'object' && 'code' in error) {
    const code = error.code;
    if (typeof code === 'string' && Object.hasOwn(safeCodes, code)) {
      return prefix + code + ': ' + safeCodes[code];
    }
  }
  // Never stringify arbitrary exceptions, stacks, causes or connection options.
  return prefix + 'Check the server configuration and database availability. Error details withheld to protect secrets.';
}
