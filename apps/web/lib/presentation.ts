import type { Job, Student } from "./types.ts";

export function companyIdentity(name: string, id = name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words
      .slice(0, 2)
      .map((word) => Array.from(word)[0])
      .join("")
      .toUpperCase() || "CO";
  const tone = Array.from(id).reduce(
    (sum, letter) => (sum + (letter.codePointAt(0) || 0)) % 4,
    0,
  );
  return { initials, tone };
}

export function compensation(
  job: Pick<
    Job,
    | "compensationMin"
    | "compensationMax"
    | "compensationCurrency"
    | "compensationPeriod"
  >,
) {
  const { compensationMin: min, compensationMax: max } = job;
  if (min === null && max === null) return "Compensation not specified";
  const format = (value: number) => value.toLocaleString("en-IN");
  const amount =
    min !== null && max !== null
      ? min === max
        ? format(min)
        : `${format(min)}–${format(max)}`
      : min !== null
        ? `From ${format(min)}`
        : `Up to ${format(max!)}`;
  return `${job.compensationCurrency} ${amount}${job.compensationPeriod === "MONTHLY" ? " / month" : job.compensationPeriod === "ANNUAL" ? " / year" : ""}`;
}

export function profileCompleteness(profile?: Student) {
  const fields: [string, boolean][] = [
    ["Name", !!profile?.fullName?.trim()],
    ["Roll number", !!profile?.collegeRollNumber?.trim()],
    ["Branch", !!profile?.branch?.trim()],
    ["Graduation year", profile?.graduationYear != null],
    ["CGPA", profile?.cgpa != null],
    ["Backlogs", profile?.activeBacklogs != null],
    ["10th percentage", profile?.tenthPercentage != null],
    ["12th percentage", profile?.twelfthPercentage != null],
    ["Skills", !!profile?.skills.length],
    ["Resume link", !!profile?.resumeUrl?.trim()],
  ];
  return {
    completed: fields.filter(([, filled]) => filled).length,
    total: fields.length,
    missing: fields.filter(([, filled]) => !filled).map(([name]) => name),
  };
}

export function upcomingJobs(jobs: Job[], now: number) {
  return jobs
    .filter(
      (job) =>
        job.status === "OPEN" &&
        job.applicationDeadline &&
        Date.parse(job.applicationDeadline) > now,
    )
    .sort(
      (a, b) =>
        Date.parse(a.applicationDeadline!) - Date.parse(b.applicationDeadline!),
    );
}

export function statusGuidance(status: string) {
  const guidance: Record<string, string> = {
    APPLIED: "Application received. Your recruiter will review your profile.",
    UNDER_REVIEW:
      "Your application is being reviewed. Keep your profile up to date.",
    SHORTLISTED:
      "You have been shortlisted. Watch for next steps from your recruiter.",
    SELECTED:
      "You have been selected. Contact your recruiter for the next steps.",
    REJECTED:
      "This application was not selected. Explore other open opportunities.",
    WITHDRAWN:
      "This application is withdrawn. You can explore other opportunities.",
  };
  return guidance[status] || "Check with your recruiter for the next steps.";
}
