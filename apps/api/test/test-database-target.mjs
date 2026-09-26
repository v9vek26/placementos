// Never load .env here: write suites must receive a separate, explicit target.
export function testDatabaseTarget(env = process.env) {
  const message =
    'Write tests require TEST_DATABASE_URL for a database ending in _test and TEST_DATABASE_CONFIRM matching that database name. No default DATABASE_URL is used.';
  let url;
  try {
    url = new URL(env.TEST_DATABASE_URL);
  } catch {
    throw new Error(message);
  }
  const name = decodeURIComponent(url.pathname.slice(1));
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !/^[a-zA-Z0-9_]+_test$/.test(name) ||
    env.TEST_DATABASE_CONFIRM !== name ||
    env.NODE_ENV === 'production' ||
    url.searchParams.has('host') ||
    url.searchParams.has('dbname')
  ) {
    throw new Error(message);
  }
  return url.toString();
}
