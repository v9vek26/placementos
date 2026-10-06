import { test } from "node:test";
import assert from "node:assert/strict";
import { companyIdentity, compensation, profileCompleteness, upcomingJobs, statusGuidance } from "../lib/presentation.ts";
test("company marks are deterministic with safe empty and non-Latin names", () => {
  assert.deepEqual(companyIdentity("Cloud Nova", "company-1"), companyIdentity("Cloud Nova", "company-1"));
  assert.equal(companyIdentity("Cloud Nova").initials, "CN");
  assert.equal(companyIdentity("   ").initials, "CO");
  assert.equal(companyIdentity("東京 大学").initials, "東大");
  assert.equal(companyIdentity("😀 Works").initials, "😀W");
});
const salary = {compensationCurrency:"INR", compensationPeriod:"ANNUAL", compensationMin:null, compensationMax:null};
test("compensation distinguishes missing, zero, equal and partial bounds", () => {
  assert.equal(compensation(salary), "Compensation not specified");
  assert.equal(compensation({...salary,compensationMin:0}), "INR From 0 / year");
  assert.equal(compensation({...salary,compensationMax:50000,compensationPeriod:"MONTHLY"}), "INR Up to 50,000 / month");
  assert.equal(compensation({...salary,compensationMin:50000,compensationMax:50000}), "INR 50,000 / year");
  assert.equal(compensation({...salary,compensationMin:50000,compensationMax:100000,compensationPeriod:null}), "INR 50,000–1,00,000");
});
test("completeness is a field checklist that counts zero as supplied", () => {
  assert.equal(profileCompleteness().completed,0);
  const profile={fullName:"Test",collegeRollNumber:"001",branch:"CSE",graduationYear:2027,cgpa:"0",activeBacklogs:0,tenthPercentage:"0",twelfthPercentage:"0",skills:[],resumeUrl:null};
  assert.equal(profileCompleteness(profile).completed,8);
  assert.deepEqual(profileCompleteness(profile).missing,["Skills","Resume link"]);
  assert.equal(profileCompleteness({...profile, skills:["TS"], resumeUrl:"https://example.com/resume"}).completed,10);
});
test("deadlines exclude closed, draft, expired and missing dates and sort soonest first", () => {
  const jobs=[{id:"later",status:"OPEN",applicationDeadline:"2026-11-05"},{id:"closed",status:"CLOSED",applicationDeadline:"2026-10-07"},{id:"none",status:"OPEN",applicationDeadline:null},{id:"expired",status:"OPEN",applicationDeadline:"2026-10-01"},{id:"soon",status:"OPEN",applicationDeadline:"2026-10-06"},{id:"draft",status:"DRAFT",applicationDeadline:"2026-10-06"}];
  assert.deepEqual(upcomingJobs(jobs,Date.parse("2026-10-05")).map(j=>j.id),["soon","later"]);
  assert.equal(jobs[0].id,"later");
});
test("terminal statuses have distinct guidance and never invent interview history", () => {
  assert.match(statusGuidance("REJECTED"),/not selected/);
  assert.match(statusGuidance("WITHDRAWN"),/withdrawn/);
  assert.match(statusGuidance("SELECTED"),/Contact your recruiter/);
  assert.doesNotMatch(statusGuidance("SHORTLISTED"),/interview scheduled|offer issued/i);
});
