import { Test } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { PrismaService } from './prisma/prisma.service.js';
describe('AppController', () => {
  it('returns database health and the user count', async () => {
    const count = vi.fn().mockResolvedValue(3);
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: { user: { count } } }],
    }).compile();
    await expect(module.get(AppController).getHealth()).resolves.toEqual({
      status: 'ok',
      database: 'connected',
      users: 3,
    });
    expect(count).toHaveBeenCalledOnce();
    await module.close();
  });
});
