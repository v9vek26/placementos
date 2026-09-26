import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

// Single-process protection. Multi-instance deployments also need a shared
// gateway limiter. Never trust forwarded headers unless the proxy is configured.
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<
    string,
    { count: number; resetAt: number }
  >();
  private readonly windowMs = 60_000;
  private readonly limit = 20;
  private readonly maxKeys = 10_000;

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const now = Date.now();
    for (const [key, entry] of this.attempts) {
      if (entry.resetAt <= now) this.attempts.delete(key);
    }
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    let entry = this.attempts.get(key);
    if (!entry) {
      if (this.attempts.size >= this.maxKeys) return this.reject(response, 60);
      entry = { count: 0, resetAt: now + this.windowMs };
      this.attempts.set(key, entry);
    }
    if (++entry.count > this.limit) {
      return this.reject(response, Math.ceil((entry.resetAt - now) / 1000));
    }
    return true;
  }

  private reject(response: Response, seconds: number): never {
    response.setHeader('Retry-After', seconds);
    throw new HttpException(
      'Too many sign-in attempts. Please try again shortly.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
