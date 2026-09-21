import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CheckEligibilityDto } from './dto/check-eligibility.dto.js';

@Injectable()
export class EligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async check(data: CheckEligibilityDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: {
        id: data.studentProfileId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const job = await this.prisma.job.findUnique({
      where: {
        id: data.jobId,
      },
      include: {
        company: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const reasons: string[] = [];

    const checks = {
      jobOpen: {
        passed: job.status === 'OPEN',
        actual: job.status,
        required: 'OPEN',
      },

      deadline: {
        passed:
          !job.applicationDeadline ||
          job.applicationDeadline.getTime() > Date.now(),
        actual: job.applicationDeadline,
        required: 'Application deadline must not have passed',
      },

      cgpa: {
        passed:
          job.minCgpa === null ||
          (student.cgpa !== null &&
            Number(student.cgpa) >= Number(job.minCgpa)),
        actual:
          student.cgpa !== null ? Number(student.cgpa) : null,
        required:
          job.minCgpa !== null ? Number(job.minCgpa) : null,
      },

      activeBacklogs: {
        passed:
          job.maxActiveBacklogs === null ||
          student.activeBacklogs <= job.maxActiveBacklogs,
        actual: student.activeBacklogs,
        required: job.maxActiveBacklogs,
      },

      tenthPercentage: {
        passed:
          job.minTenthPercentage === null ||
          (student.tenthPercentage !== null &&
            Number(student.tenthPercentage) >=
              Number(job.minTenthPercentage)),
        actual:
          student.tenthPercentage !== null
            ? Number(student.tenthPercentage)
            : null,
        required:
          job.minTenthPercentage !== null
            ? Number(job.minTenthPercentage)
            : null,
      },

      twelfthPercentage: {
        passed:
          job.minTwelfthPercentage === null ||
          (student.twelfthPercentage !== null &&
            Number(student.twelfthPercentage) >=
              Number(job.minTwelfthPercentage)),
        actual:
          student.twelfthPercentage !== null
            ? Number(student.twelfthPercentage)
            : null,
        required:
          job.minTwelfthPercentage !== null
            ? Number(job.minTwelfthPercentage)
            : null,
      },

      branch: {
        passed:
          job.eligibleBranches.length === 0 ||
          job.eligibleBranches.some(
            (branch) =>
              branch.trim().toLowerCase() ===
              student.branch.trim().toLowerCase(),
          ),
        actual: student.branch,
        required: job.eligibleBranches,
      },

      graduationYear: {
        passed:
          job.graduationYears.length === 0 ||
          job.graduationYears.includes(student.graduationYear),
        actual: student.graduationYear,
        required: job.graduationYears,
      },
    };

    if (!checks.jobOpen.passed) {
      reasons.push('This job is not currently open for applications.');
    }

    if (!checks.deadline.passed) {
      reasons.push('The application deadline has passed.');
    }

    if (!checks.cgpa.passed) {
      reasons.push(
        student.cgpa === null
          ? 'CGPA is missing from the student profile.'
          : `CGPA must be at least ${checks.cgpa.required}.`,
      );
    }

    if (!checks.activeBacklogs.passed) {
      reasons.push(
        `Active backlogs must not exceed ${checks.activeBacklogs.required}.`,
      );
    }

    if (!checks.tenthPercentage.passed) {
      reasons.push(
        student.tenthPercentage === null
          ? '10th percentage is missing from the student profile.'
          : `10th percentage must be at least ${checks.tenthPercentage.required}%.`,
      );
    }

    if (!checks.twelfthPercentage.passed) {
      reasons.push(
        student.twelfthPercentage === null
          ? '12th percentage is missing from the student profile.'
          : `12th percentage must be at least ${checks.twelfthPercentage.required}%.`,
      );
    }

    if (!checks.branch.passed) {
      reasons.push(
        `Branch ${student.branch} is not eligible for this opportunity.`,
      );
    }

    if (!checks.graduationYear.passed) {
      reasons.push(
        `Graduation year ${student.graduationYear} is not eligible for this opportunity.`,
      );
    }

    const eligible = Object.values(checks).every(
      (check) => check.passed,
    );

    return {
      eligible,
      student: {
        id: student.id,
        fullName: student.fullName,
      },
      job: {
        id: job.id,
        title: job.title,
        company: job.company.name,
      },
      checks,
      reasons,
    };
  }
}