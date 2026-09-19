import { Test, TestingModule } from '@nestjs/testing';
import { StudentProfilesService } from './student-profiles.service.js';

describe('StudentProfilesService', () => {
  let service: StudentProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentProfilesService],
    }).compile();

    service = module.get<StudentProfilesService>(StudentProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
