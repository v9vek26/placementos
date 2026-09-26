import { runtimeConfig } from './runtime-config.js';
import { randomBytes } from 'node:crypto';

const valid = () => ({
  DATABASE_URL: 'postgresql://localhost/unused',
  JWT_SECRET: randomBytes(32).toString('hex'),
});
describe('runtime configuration', () => {
  it('keeps development ports and origins', () => {
    expect(runtimeConfig(valid())).toEqual({
      port: 4000,
      origins: ['http://localhost:3000'],
      trustProxy: 0,
    });
  });
  it('accepts explicit production settings', () => {
    expect(
      runtimeConfig({
        ...valid(),
        NODE_ENV: 'production',
        PORT: '8080',
        CORS_ORIGINS: 'https://web.example, https://other.example',
        TRUST_PROXY_HOPS: '1',
      }),
    ).toEqual({
      port: 8080,
      origins: ['https://web.example', 'https://other.example'],
      trustProxy: 1,
    });
  });
  it.each([
    { DATABASE_URL: '' },
    { JWT_SECRET: '' },
    { PORT: 'bad' },
    { PORT: '0' },
    { PORT: '65536' },
    { CORS_ORIGINS: '*' },
    { CORS_ORIGINS: 'https://web.example/path' },
    { CORS_ORIGINS: '   ' },
    { TRUST_PROXY_HOPS: '-1' },
    { TRUST_PROXY_HOPS: 'true' },
  ])('rejects invalid settings %j', (invalid) => {
    expect(() => runtimeConfig({ ...valid(), ...invalid })).toThrow();
  });
  it('requires HTTPS origins and a strong non-placeholder production secret', () => {
    const production = { ...valid(), NODE_ENV: 'production' };
    expect(() => runtimeConfig(production)).toThrow(/CORS/);
    expect(() =>
      runtimeConfig({ ...production, CORS_ORIGINS: 'http://web.example' }),
    ).toThrow(/HTTPS/);
    expect(() =>
      runtimeConfig({
        ...production,
        CORS_ORIGINS: 'https://web.example',
        JWT_SECRET: 'short',
      }),
    ).toThrow(/JWT/);
    expect(() =>
      runtimeConfig({
        ...production,
        CORS_ORIGINS: 'https://web.example',
        JWT_SECRET: 'REPLACE_'.repeat(8),
      }),
    ).toThrow(/JWT/);
  });
});
