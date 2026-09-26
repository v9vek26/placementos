import type { ExecutionContext } from '@nestjs/common';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';

describe('sign-in throttling', () => {
  afterEach(() => vi.restoreAllMocks());
  const context = (ip: string, setHeader = vi.fn()) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ ip, socket: {} }),
        getResponse: () => ({ setHeader }),
      }),
    }) as unknown as ExecutionContext;
  it('allows 20 attempts, then rejects attempts with Retry-After', () => {
    const guard = new AuthRateLimitGuard();
    const setHeader = vi.fn();
    const request = context('127.0.0.1', setHeader);
    for (let i = 0; i < 20; i++) expect(guard.canActivate(request)).toBe(true);
    expect(() => guard.canActivate(request)).toThrow(/Too many/);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    expect(guard.canActivate(context('127.0.0.2'))).toBe(true);
  });
  it('expires counters after one minute', () => {
    const time = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const guard = new AuthRateLimitGuard();
    const request = context('127.0.0.1');
    for (let i = 0; i < 20; i++) guard.canActivate(request);
    time.mockReturnValue(61_000);
    expect(guard.canActivate(request)).toBe(true);
  });
});
