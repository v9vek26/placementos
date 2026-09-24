import { Test } from '@nestjs/testing';
import { StudentProfilesController } from './student-profiles.controller.js';
import { StudentProfilesService } from './student-profiles.service.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { Role } from '../generated/prisma/enums.js';
describe('StudentProfilesController', () => {
  it('passes the authenticated identity to profile queries', async () => {
    const findAll = vi.fn().mockResolvedValue([]);
    const module = await Test.createTestingModule({
      controllers: [StudentProfilesController],
      providers: [{ provide: StudentProfilesService, useValue: { findAll } }],
    }).compile();
    const user = {
      userId: 'student',
      email: 'fixture@example.com',
      role: Role.STUDENT,
    };
    await expect(
      module
        .get(StudentProfilesController)
        .findAll({ user } as AuthenticatedRequest),
    ).resolves.toEqual([]);
    expect(findAll).toHaveBeenCalledWith(user);
    await module.close();
  });
});
