import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapFirstAdmin } from '../scripts/bootstrap-admin.mjs';

const email = 'operator@example.invalid';
function setup({ admins = 0, account = true } = {}) {
  let writes = 0;
  const tx = {
    user: {
      count: async () => admins,
      findUnique: async ({ where }) => {
        assert.equal(where.email, email);
        return account
          ? {
              id: 'fixture-id',
              email,
              role: 'STUDENT',
              passwordHash: 'fixture-hash',
            }
          : null;
      },
      update: async ({ where, data }) => {
        assert.deepEqual(where, { id: 'fixture-id' });
        assert.deepEqual(data, { role: 'ADMIN' });
        writes++;
      },
    },
  };
  const prisma = {
    $transaction: async (callback, options) => {
      assert.deepEqual(options, { isolationLevel: 'Serializable' });
      return callback(tx);
    },
  };
  return { prisma, writes: () => writes };
}
void test('administrator bootstrap is read-only by default', async () => {
  const fixture = setup();
  assert.deepEqual(await bootstrapFirstAdmin(fixture.prisma, email), {
    applied: false,
  });
  assert.equal(fixture.writes(), 0);
});
void test('bootstrap refuses mismatched confirmation and already initialized installations', async () => {
  const fixture = setup({ admins: 1 });
  await assert.rejects(
    bootstrapFirstAdmin(fixture.prisma, email, 'other@example.invalid'),
    /exactly match/,
  );
  await assert.rejects(
    bootstrapFirstAdmin(fixture.prisma, email, email),
    /already exists/,
  );
  assert.equal(fixture.writes(), 0);
});
void test('bootstrap never creates a missing account', async () => {
  const fixture = setup({ account: false });
  await assert.rejects(
    bootstrapFirstAdmin(fixture.prisma, email, email),
    /Register/,
  );
  assert.equal(fixture.writes(), 0);
});
void test('bootstrap promotes only the exact confirmed account', async () => {
  const fixture = setup();
  assert.deepEqual(await bootstrapFirstAdmin(fixture.prisma, email, email), {
    applied: true,
  });
  assert.equal(fixture.writes(), 1);
});
