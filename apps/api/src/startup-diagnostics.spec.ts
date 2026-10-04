import { RuntimeConfigError, runtimeConfig } from './runtime-config.js';
import { startupDiagnostic } from './startup-diagnostics.js';

describe('safe startup diagnostics', () => {
  it('identifies missing configuration without exposing other settings', () => {
    let failure: unknown;
    try { runtimeConfig({ DATABASE_URL: 'postgresql://private:secret@host/db' }); }
    catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(RuntimeConfigError);
    expect(startupDiagnostic(failure, 'configuration')).toBe('API startup failed [configuration]. JWT_SECRET is required.');
  });
  it('withholds arbitrary messages, stacks and nested causes', () => {
    const secret = 'postgresql://private:secret@host/db';
    const error = new Error(secret, { cause: new Error(secret) });
    expect(startupDiagnostic(error, 'initialization')).not.toContain(secret);
    expect(startupDiagnostic(error, 'initialization')).toContain('[initialization]');
  });
  it('reports allowlisted codes without their private error context', () => {
    const error = Object.assign(new Error('private connection string'), { code: 'P1000' });
    expect(startupDiagnostic(error, 'initialization')).toContain('P1000: Database authentication failed.');
    expect(startupDiagnostic(error, 'initialization')).not.toContain('private connection string');
    expect(startupDiagnostic({ code: 'EADDRINUSE' }, 'listen')).toContain('PORT is already in use');
  });
  it.each([null, undefined, 'secret', { code: 'secret' }, { code: 'constructor' }])('withholds unknown thrown values', (error) => {
    expect(startupDiagnostic(error, 'initialization')).toContain('Error details withheld');
  });
});
