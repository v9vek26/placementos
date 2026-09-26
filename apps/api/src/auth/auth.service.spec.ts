import { ConflictException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { validate } from 'class-validator';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';

vi.mock('bcrypt', () => ({ hash: vi.fn().mockResolvedValue('test-hash') }));
describe('registration edge cases', () => {
  it('maps a database duplicate race to a conflict without signing a token', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValue({ code: 'P2002' }),
      },
    };
    const jwt = { signAsync: vi.fn() };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
    await expect(
      service.register({
        email: 'fixture@example.invalid',
        password: 'unused-test-input',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
  it('does not hide unrelated database failures', async () => {
    const error = new Error('unavailable');
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValue(error),
      },
    };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      {} as JwtService,
    );
    await expect(
      service.register({
        email: 'fixture@example.invalid',
        password: 'unused-test-input',
      }),
    ).rejects.toBe(error);
  });
  it('rejects passwords bcrypt would silently truncate, including multibyte text', async () => {
    for (const password of ['x'.repeat(73), '🙂'.repeat(19)]) {
      const dto = Object.assign(new RegisterDto(), {
        email: 'fixture@example.invalid',
        password,
      });
      expect(
        (await validate(dto)).some((error) => error.property === 'password'),
      ).toBe(true);
    }
    const dto = Object.assign(new RegisterDto(), {
      email: 'fixture@example.invalid',
      password: 'x'.repeat(72),
    });
    expect(await validate(dto)).toEqual([]);
  });
});
