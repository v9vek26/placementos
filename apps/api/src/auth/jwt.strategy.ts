import { PrismaService } from '../prisma/prisma.service.js';
import { Role } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from './authenticated-request.js';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub?: unknown;
    role?: unknown;
  }): Promise<AuthenticatedUser> {
    if (
      typeof payload.sub !== 'string' ||
      !payload.sub.trim() ||
      !Object.values(Role).includes(payload.role as Role)
    ) {
      throw new UnauthorizedException();
    }
    // Resolve current identity so account deletion and role changes apply immediately.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new UnauthorizedException();
    return { userId: user.id, email: user.email, role: user.role };
  }
}
