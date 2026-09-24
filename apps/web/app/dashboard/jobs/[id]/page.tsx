"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/workspace";
import {
  Badge,
  date,
  Heading,
  Notice,
  State,
  useResource,
} from "@/components/ui";
import { errorMessage, write } from "@/lib/api";
import type { Application, Eligibility, Job, Student } from "@/lib/types";
export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const user = useSession();
  const resource = useResource<Job>(`/jobs/${id}`);
  const job = resource.data;
  const canManage =
    user.role === "ADMIN" ||
    (user.role === "RECRUITER" && job?.recruiter?.userId === user.userId);
  return (
    <>
      <Link href="/dashboard/jobs">← All opportunities</Link>
      <State {...resource} retry={resource.reload} />
      {job && (
        <>
          <Heading title={job.title} description={job.company.name}>
            {canManage && (
              <Link className="button" href={`/dashboard/jobs/${id}/edit`}>
                Edit job
              </Link>
            )}
          </Heading>
          <div className="details">
            <section>
              <article className="card">
                <div className="metadata">
                  <Badge value={job.status} />
                  <Badge value={job.type} />
                  <Badge value={job.workMode} />
                  <span>{job.location || "Location not specified"}</span>
                </div>
                <h2>About this opportunity</h2>
                <p className="prose">{job.description}</p>
                <h3>Compensation</h3>
                <p>
                  {job.compensationMin !== null || job.compensationMax !== null
                    ? `${job.compensationCurrency} ${job.compensationMin?.toLocaleString() ?? "Not specified"} – ${job.compensationMax?.toLocaleString() ?? "Not specified"}${job.compensationPeriod ? ` / ${job.compensationPeriod.toLowerCase()}` : ""}`
                    : "Not specified"}
                </p>
              </article>
              {canManage && (
                <Link
                  className="button secondary"
                  href={`/dashboard/applications?jobId=${id}`}
                >
                  View applicants
                </Link>
              )}
            </section>
            <aside>
              <article className="card">
                <h2>Eligibility requirements</h2>
                <dl>
                  {[
                    ["Minimum CGPA", job.minCgpa ?? "No minimum"],
                    [
                      "Maximum active backlogs",
                      job.maxActiveBacklogs ?? "No limit",
                    ],
                    ["10th percentage", job.minTenthPercentage ?? "No minimum"],
                    [
                      "12th percentage",
                      job.minTwelfthPercentage ?? "No minimum",
                    ],
                    [
                      "Branches",
                      job.eligibleBranches.join(", ") || "All branches",
                    ],
                    [
                      "Graduation years",
                      job.graduationYears.join(", ") || "All years",
                    ],
                    ["Deadline", date(job.applicationDeadline)],
                  ].map(([name, value]) => (
                    <div className="metadata" key={name}>
                      <dt>{name}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
              {user.role === "STUDENT" && <StudentAction jobId={id} />}
            </aside>
          </div>
        </>
      )}
    </>
  );
}
function StudentAction({ jobId }: { jobId: string }) {
  const profiles = useResource<Student[]>("/student-profiles");
  const applications = useResource<Application[]>("/applications");
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const profile = profiles.data?.[0];
  const applied = applications.data?.find((a) => a.job.id === jobId);
  async function act(apply: boolean) {
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      const data = { studentProfileId: profile.id, jobId };
      if (apply) {
        const result = await write<Application>("/applications", "POST", data);
        applications.setData([...(applications.data || []), result]);
      } else
        setEligibility(
          await write<Eligibility>("/eligibility/check", "POST", data),
        );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="card">
      <h2>Your application</h2>
      <State {...profiles} retry={profiles.reload} />
      <State {...applications} retry={applications.reload} />
      <Notice error={error} />
      {!profiles.loading && !profiles.error && !profile && (
        <>
          <p>Create your student profile before checking eligibility.</p>
          <Link href="/dashboard/profile">Complete profile →</Link>
        </>
      )}
      {applied ? (
        <>
          <Badge value={applied.status} />
          <p>Applied on {date(applied.appliedAt)}</p>
          <Link href="/dashboard/applications">Track application →</Link>
        </>
      ) : (
        profile &&
        !applications.loading &&
        !applications.error && (
          <>
            <button disabled={busy} onClick={() => void act(false)}>
              {busy ? "Please wait…" : "Check eligibility"}
            </button>
            {eligibility && (
              <>
                <Notice
                  success={
                    eligibility.eligible
                      ? "You meet the current requirements."
                      : undefined
                  }
                  error={
                    !eligibility.eligible
                      ? eligibility.reasons.join(" ")
                      : undefined
                  }
                />
                <ul className="checks">
                  {Object.entries(eligibility.checks).map(([name, check]) => (
                    <li key={name}>
                      {check.passed ? "✓" : "✕"}{" "}
                      {name.replace(/([A-Z])/g, " $1")}
                    </li>
                  ))}
                </ul>
                {eligibility.eligible && (
                  <button disabled={busy} onClick={() => void act(true)}>
                    Apply now
                  </button>
                )}
              </>
            )}
          </>
        )
      )}
    </article>
  );
}
