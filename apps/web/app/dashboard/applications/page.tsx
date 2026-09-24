"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/components/workspace";
import {
  Badge,
  date,
  Empty,
  Heading,
  Notice,
  safeUrl,
  State,
  useResource,
} from "@/components/ui";
import { errorMessage, write } from "@/lib/api";
import { applicationStatuses, type Application } from "@/lib/types";
export default function ApplicationsPage() {
  return (
    <Suspense fallback={<p>Loading applications…</p>}>
      <ApplicationList />
    </Suspense>
  );
}
function ApplicationList() {
  const user = useSession();
  const params = useSearchParams();
  const resource = useResource<Application[]>("/applications");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const jobId = params.get("jobId");
  const applications = resource.data?.filter(
    (a) =>
      (!jobId || a.job.id === jobId) &&
      (status === "all" || a.status === status) &&
      `${a.job.title} ${a.job.company.name} ${a.studentProfile.fullName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        title={
          user.role === "STUDENT" ? "My applications" : "Review applicants"
        }
        description={
          user.role === "STUDENT"
            ? "Follow every step of your placement journey."
            : "Review profiles and keep applicants moving forward."
        }
      />
      <div className="toolbar">
        <input
          aria-label="Search applications"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search applications"
        />
        <select
          aria-label="Filter application status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          {applicationStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {jobId && <Link href="/dashboard/applications">Clear job filter</Link>}
      </div>
      <State {...resource} retry={resource.reload} />
      {!resource.error && applications?.length === 0 && (
        <Empty>
          No applications match this view.{" "}
          {user.role === "STUDENT" && (
            <Link href="/dashboard/jobs">Browse opportunities →</Link>
          )}
        </Empty>
      )}
      {applications?.map((application) => (
        <ApplicationCard
          key={application.id}
          application={application}
          editable={user.role !== "STUDENT"}
          onSaved={(saved) =>
            resource.setData(
              (items) =>
                items?.map((item) => (item.id === saved.id ? saved : item)) ||
                [],
            )
          }
        />
      ))}
    </>
  );
}
function ApplicationCard({
  application: a,
  editable,
  onSaved,
}: {
  application: Application;
  editable: boolean;
  onSaved: (a: Application) => void;
}) {
  const [status, setStatus] = useState(a.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      onSaved(
        await write<Application>(`/applications/${a.id}/status`, "PATCH", {
          status,
        }),
      );
      setSuccess("Application status updated.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const profile = a.studentProfile;
  const resume = safeUrl(profile.resumeUrl);
  return (
    <article className="card">
      <div className="row">
        <div>
          <p className="eyebrow">{a.job.company.name}</p>
          <h2>{a.job.title}</h2>
          <p>
            {profile.fullName} · Applied {date(a.appliedAt)}
          </p>
        </div>
        <Badge value={a.status} />
      </div>
      {a.job.status === "OPEN" || editable ? (
        <Link href={`/dashboard/jobs/${a.job.id}`}>View job →</Link>
      ) : (
        <p>This job is closed. Your application remains available here.</p>
      )}
      {editable && (
        <>
          <details>
            <summary>Student profile</summary>
            <div className="metadata">
              <span>Roll number: {profile.collegeRollNumber}</span>
              <span>
                {profile.branch} · {profile.graduationYear}
              </span>
              <span>CGPA: {profile.cgpa ?? "Not provided"}</span>
              <span>Backlogs: {profile.activeBacklogs}</span>
              <span>10th: {profile.tenthPercentage ?? "Not provided"}</span>
              <span>12th: {profile.twelfthPercentage ?? "Not provided"}</span>
            </div>
            <p>Skills: {profile.skills.join(", ") || "Not provided"}</p>
            {resume && (
              <a href={resume} target="_blank" rel="noopener noreferrer">
                Open resume ↗
              </a>
            )}
          </details>
          <div className="actions">
            <label className="field">
              Application status
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Application["status"])
                }
                disabled={busy}
              >
                {applicationStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button
              disabled={busy || status === a.status}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Update status"}
            </button>
          </div>
        </>
      )}
      <Notice error={error} success={success} />
    </article>
  );
}
