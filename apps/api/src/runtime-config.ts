export function runtimeConfig(env: NodeJS.ProcessEnv) {
  const production = env.NODE_ENV === 'production';
  if (!env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required.');
  if (!env.JWT_SECRET?.trim()) throw new Error('JWT_SECRET is required.');
  if (
    production &&
    (env.JWT_SECRET.length < 32 || /REPLACE_|placeholder/i.test(env.JWT_SECRET))
  ) {
    throw new Error(
      'Production JWT_SECRET must be a unique random secret of at least 32 characters.',
    );
  }
  const port = Number(env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be between 1 and 65535.');
  const origins = (
    env.CORS_ORIGINS || (production ? '' : 'http://localhost:3000')
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!origins.length)
    throw new Error('CORS_ORIGINS is required in production.');
  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error('CORS_ORIGINS must contain exact HTTP(S) origins.');
    }
    if (
      url.origin !== origin ||
      !['http:', 'https:'].includes(url.protocol) ||
      (production && url.protocol !== 'https:')
    ) {
      throw new Error(
        'CORS_ORIGINS must contain exact origins; production requires HTTPS.',
      );
    }
  }
  const trustProxy = Number(env.TRUST_PROXY_HOPS ?? 0);
  if (!Number.isInteger(trustProxy) || trustProxy < 0 || trustProxy > 10)
    throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 10.');
  return { port, origins, trustProxy };
}
