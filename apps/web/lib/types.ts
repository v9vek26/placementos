export const roles = ["STUDENT", "RECRUITER", "ADMIN"] as const;
export type Role = (typeof roles)[number];
export type Session = { userId: string; email: string; role: Role };
export type User = { id: string; email: string; role: Role; createdAt: string };
export const applicationStatuses = [
  "APPLIED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "REJECTED",
  "SELECTED",
  "WITHDRAWN",
] as const;
export const jobTypes = ["JOB", "INTERNSHIP"] as const;
export const jobStatuses = ["DRAFT", "OPEN", "CLOSED"] as const;
export const workModes = ["ONSITE", "HYBRID", "REMOTE"] as const;
export const compensationPeriods = ["MONTHLY", "ANNUAL"] as const;
export type Company = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  description: string | null;
};
export type Recruiter = {
  id: string;
  userId: string;
  companyId: string;
  fullName: string;
  jobTitle: string | null;
  phone: string | null;
  company: Company;
  user: User;
};
export type Student = {
  id: string;
  userId: string;
  fullName: string;
  collegeRollNumber: string;
  branch: string;
  graduationYear: number;
  cgpa: string | null;
  activeBacklogs: number;
  tenthPercentage: string | null;
  twelfthPercentage: string | null;
  skills: string[];
  resumeUrl: string | null;
};
export type Job = {
  id: string;
  recruiterId: string;
  companyId: string;
  title: string;
  description: string;
  type: (typeof jobTypes)[number];
  status: (typeof jobStatuses)[number];
  workMode: (typeof workModes)[number];
  location: string | null;
  compensationMin: number | null;
  compensationMax: number | null;
  compensationCurrency: string;
  compensationPeriod: (typeof compensationPeriods)[number] | null;
  minCgpa: string | null;
  maxActiveBacklogs: number | null;
  minTenthPercentage: string | null;
  minTwelfthPercentage: string | null;
  eligibleBranches: string[];
  graduationYears: number[];
  applicationDeadline: string | null;
  company: Company;
  recruiter?: Recruiter;
};
export type Application = {
  id: string;
  status: (typeof applicationStatuses)[number];
  appliedAt: string;
  updatedAt: string;
  job: Job;
  studentProfile: Student;
};
export type Eligibility = {
  eligible: boolean;
  reasons: string[];
  checks: Record<
    string,
    { passed: boolean; actual: unknown; required: unknown }
  >;
};
