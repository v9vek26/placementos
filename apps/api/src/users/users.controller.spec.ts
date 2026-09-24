import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { Role } from '../generated/prisma/enums.js';
describe('UsersController', () => {
  it('passes an administrator role change to the users service', async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ id: 'user', role: Role.RECRUITER });
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: { update } }],
    }).compile();
    await expect(
      module.get(UsersController).update('user', { role: Role.RECRUITER }),
    ).resolves.toEqual({ id: 'user', role: Role.RECRUITER });
    expect(update).toHaveBeenCalledWith('user', { role: Role.RECRUITER });
    await module.close();
  });
});
