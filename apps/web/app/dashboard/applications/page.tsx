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
import { CompanyMark, SectionHeading } from "@/components/product";
import { statusGuidance } from "@/lib/presentation";
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
            ? "Your applications, current statuses, and next steps."
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
      {applications && !resource.error && (
        <SectionHeading
          title={`${applications.length} ${user.role === "STUDENT" ? (applications.length === 1 ? "application" : "applications") : applications.length === 1 ? "candidate" : "candidates"}`}
          description={
            user.role === "STUDENT"
              ? "Status reflects the latest saved recruiter decision."
              : "Review each profile and save status changes explicitly."
          }
        />
      )}
      {user.role !== "STUDENT" && applications && applications.length > 0 ? (
        <div
          className="table-wrap"
          role="region"
          aria-label="Candidate review"
          tabIndex={0}
        >
          <table className="responsive-table candidate-table">
            <caption className="sr-only">
              Candidates and current application status
            </caption>
            <thead>
              <tr>
                <th scope="col">Candidate</th>
                <th scope="col">Opportunity</th>
                <th scope="col">Profile</th>
                <th scope="col">Status &amp; action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  editable
                  onSaved={(saved) =>
                    resource.setData(
                      (items) =>
                        items?.map((item) =>
                          item.id === saved.id ? saved : item,
                        ) || [],
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        applications?.map((application) => (
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
        ))
      )}
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
  if (editable)
    return (
      <tr>
        <td>
          <div className="identity">
            <CompanyMark name={profile.fullName} id={profile.id} />
            <div>
              <strong>{profile.fullName}</strong>
              <p className="company-name">Applied {date(a.appliedAt)}</p>
            </div>
          </div>
        </td>
        <td data-label="Opportunity">
          <Link href={"/dashboard/jobs/" + a.job.id}>{a.job.title}</Link>
          <p className="company-name">{a.job.company.name}</p>
        </td>
        <td data-label="Profile">
          <p>
            {profile.branch} · {profile.graduationYear}
          </p>
          <small>CGPA {profile.cgpa ?? "not provided"}</small>
          <details>
            <summary>Student profile</summary>
            <p>Roll number: {profile.collegeRollNumber}</p>
            <p>
              Active backlogs: {profile.activeBacklogs}
              <br />
              10th: {profile.tenthPercentage ?? "Not provided"}
              <br />
              12th: {profile.twelfthPercentage ?? "Not provided"}
            </p>
            <p>Skills: {profile.skills.join(", ") || "Not provided"}</p>
            {resume && (
              <a href={resume} target="_blank" rel="noopener noreferrer">
                Open resume ↗
              </a>
            )}
          </details>
        </td>
        <td data-label="Status">
          <Badge value={a.status} />
          <div className="candidate-controls">
            <label className="field">
              Application status
              <select
                value={status}
                aria-label={`Application status for ${profile.fullName}`}
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
              aria-label={`Update status for ${profile.fullName}`}
              disabled={busy || status === a.status}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Update status"}
            </button>
          </div>
          <Notice error={error} success={success} />
        </td>
      </tr>
    );
  return (
    <article className="card application-card">
      <div className="row">
        <div className="identity">
          <CompanyMark
            name={editable ? profile.fullName : a.job.company.name}
            id={editable ? profile.id : a.job.companyId}
          />
          <div>
            <p className="eyebrow">{a.job.company.name}</p>
            <h2>{editable ? profile.fullName : a.job.title}</h2>
            <p>
              {editable ? a.job.title : profile.fullName} · Applied{" "}
              {date(a.appliedAt)}
            </p>
          </div>
        </div>
        <Badge value={a.status} />
      </div>
      {a.job.status === "OPEN" || editable ? (
        <Link href={`/dashboard/jobs/${a.job.id}`}>View job →</Link>
      ) : (
        <p>This job is closed. Your application remains available here.</p>
      )}
      {!editable && (
        <div className="current-status">
          <strong>What comes next</strong>
          <p>{statusGuidance(a.status)}</p>
          <small>
            Record updated {date(a.updatedAt)} · Current status only
          </small>
        </div>
      )}
      <Notice error={error} success={success} />
    </article>
  );
}
