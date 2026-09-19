import { Test, TestingModule } from '@nestjs/testing';
import { StudentProfilesController } from './student-profiles.controller.js';

describe('StudentProfilesController', () => {
  let controller: StudentProfilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentProfilesController],
    }).compile();

    controller = module.get<StudentProfilesController>(StudentProfilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
