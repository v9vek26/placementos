import { pathToFileURL } from 'node:url';

export class BootstrapError extends Error {}

export async function bootstrapFirstAdmin(prisma, email, confirmedEmail) {
  if (
    typeof email !== 'string' ||
    !email.includes('@') ||
    email.trim() !== email
  ) {
    throw new BootstrapError(
      'Provide the exact registered email with --email.',
    );
  }
  if (confirmedEmail !== undefined && confirmedEmail !== email) {
    throw new BootstrapError('--confirm-email must exactly match --email.');
  }
  return prisma.$transaction(
    async (tx) => {
      if (await tx.user.count({ where: { role: 'ADMIN' } })) {
        throw new BootstrapError(
          'An administrator already exists. Use the administrator workspace to manage access.',
        );
      }
      const user = await tx.user.findUnique({
        where: { email },
        select: { id: true, email: true, role: true, passwordHash: true },
      });
      if (!user?.passwordHash) {
        throw new BootstrapError(
          'No sign-in account exists for that email. Register it through the website first.',
        );
      }
      if (confirmedEmail === undefined) return { applied: false };
      await tx.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
        select: { id: true },
      });
      return { applied: true };
    },
    { isolationLevel: 'Serializable' },
  );
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (
      !['--email', '--confirm-email'].includes(args[i]) ||
      !args[i + 1] ||
      options[args[i]]
    ) {
      throw new BootstrapError(
        'Usage: admin:bootstrap --email REGISTERED_EMAIL [--confirm-email REGISTERED_EMAIL]. Without confirmation, this is read-only.',
      );
    }
    options[args[i]] = args[i + 1];
  }
  if (!options['--email'])
    throw new BootstrapError(
      'Provide --email REGISTERED_EMAIL. No account was changed.',
    );
  await import('dotenv/config');
  const { ConfigService } = await import('@nestjs/config');
  const { PrismaService } = await import('../dist/prisma/prisma.service.js');
  const prisma = new PrismaService(new ConfigService());
  try {
    const result = await bootstrapFirstAdmin(
      prisma,
      options['--email'],
      options['--confirm-email'],
    );
    console.log(
      result.applied
        ? 'First administrator assigned. Sign in again to refresh the workspace.'
        : 'Read-only check passed. No account changed. To apply, repeat with --confirm-email matching the intended email.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(
      error instanceof BootstrapError
        ? error.message
        : 'Administrator bootstrap failed. Check database connectivity or concurrent changes.',
    );
    process.exitCode = 1;
  });
}
