import assert from 'node:assert/strict';
import { test } from 'node:test';
import { testDatabaseTarget } from './test-database-target.mjs';

const valid = {
  TEST_DATABASE_URL:
    'postgresql://unused:unused@localhost:5432/placementos_test',
  TEST_DATABASE_CONFIRM: 'placementos_test',
};
void test('write-test target accepts an explicitly confirmed test database', () => {
  assert.equal(testDatabaseTarget(valid), valid.TEST_DATABASE_URL);
});
for (const invalid of [
  {},
  { DATABASE_URL: valid.TEST_DATABASE_URL },
  { ...valid, TEST_DATABASE_CONFIRM: '' },
  { ...valid, TEST_DATABASE_CONFIRM: 'other_test' },
  {
    ...valid,
    TEST_DATABASE_URL: 'postgresql://localhost/placementos',
    TEST_DATABASE_CONFIRM: 'placementos',
  },
  { ...valid, TEST_DATABASE_URL: 'https://localhost/placementos_test' },
  {
    ...valid,
    TEST_DATABASE_URL:
      'postgresql://localhost/placementos_test?dbname=placementos',
  },
  { ...valid, NODE_ENV: 'production' },
]) {
  void test(`write-test target refuses unsafe input ${JSON.stringify(Object.keys(invalid))}`, () => {
    assert.throws(() => testDatabaseTarget(invalid), /Write tests require/);
  });
}
void test('invalid URL messages never disclose credentials', () => {
  const marker = 'credential-marker';
  assert.throws(
    () => testDatabaseTarget({ ...valid, TEST_DATABASE_URL: marker }),
    (error) => {
      assert.equal(error.message.includes(marker), false);
      return true;
    },
  );
});
