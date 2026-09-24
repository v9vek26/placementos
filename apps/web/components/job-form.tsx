"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "./workspace";
import {
  Empty,
  Field,
  formBody,
  Heading,
  Notice,
  Select,
  State,
  Textarea,
  useResource,
} from "./ui";
import { errorMessage, write } from "@/lib/api";
import {
  compensationPeriods,
  jobStatuses,
  jobTypes,
  workModes,
  type Job,
  type Recruiter,
} from "@/lib/types";
const nullable = [
  "location",
  "compensationMin",
  "compensationMax",
  "compensationPeriod",
  "minCgpa",
  "maxActiveBacklogs",
  "minTenthPercentage",
  "minTwelfthPercentage",
  "applicationDeadline",
];
export function JobEditor({ job }: { job?: Job }) {
  const user = useSession();
  const recruiters = useResource<Recruiter[]>("/recruiters");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (
    user.role === "STUDENT" ||
    (job && user.role !== "ADMIN" && job.recruiter?.userId !== user.userId)
  )
    return <Empty>You cannot manage this opportunity.</Empty>;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = formBody(
        event.currentTarget,
        [
          "compensationMin",
          "compensationMax",
          "minCgpa",
          "maxActiveBacklogs",
          "minTenthPercentage",
          "minTwelfthPercentage",
        ],
        ["eligibleBranches", "graduationYears"],
        job ? nullable : [],
      );
      body.graduationYears = (body.graduationYears as string[]).map(Number);
      if (
        (body.graduationYears as number[]).some(
          (year) => !Number.isInteger(year) || year < 1900 || year > 2200,
        )
      )
        throw new Error(
          "Enter graduation years separated by commas, for example 2028, 2029.",
        );
      if (
        body.compensationMin != null &&
        body.compensationMax != null &&
        Number(body.compensationMin) > Number(body.compensationMax)
      )
        throw new Error(
          "Minimum compensation cannot exceed maximum compensation.",
        );
      if (body.applicationDeadline)
        body.applicationDeadline = new Date(
          String(body.applicationDeadline),
        ).toISOString();
      const saved = await write<Job>(
        job ? `/jobs/${job.id}` : "/jobs",
        job ? "PATCH" : "POST",
        body,
      );
      router.push(`/dashboard/jobs/${saved.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !job ||
      !window.confirm(
        `Delete “${job.title}”? All applications for this job will also be permanently deleted. Close the job instead to preserve application history.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await write(`/jobs/${job.id}`, "DELETE");
      router.push("/dashboard/jobs");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  const localDeadline = job?.applicationDeadline
    ? new Date(
        new Date(job.applicationDeadline).getTime() -
          new Date(job.applicationDeadline).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
  return (
    <>
      <Heading
        title={job ? "Edit opportunity" : "Create an opportunity"}
        description="Set clear expectations and help the right students find you."
      />
      <State {...recruiters} retry={recruiters.reload} />
      <Notice error={error} />
      {recruiters.data && recruiters.data.length === 0 ? (
        <Empty>
          A recruiter profile is required to post jobs. Ask an administrator to
          link your account to a company.
        </Empty>
      ) : (
        recruiters.data && (
          <form onSubmit={submit} className="card">
            <fieldset disabled={busy}>
              <div className="form-grid">
                {!job && (
                  <label className="field wide">
                    Posting recruiter
                    <select name="recruiterId" required>
                      {recruiters.data.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.fullName} — {r.company.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <Field
                  label="Job title"
                  name="title"
                  value={job?.title}
                  required
                  maxLength={200}
                />
                <Select
                  label="Type"
                  name="type"
                  value={job?.type || "JOB"}
                  options={jobTypes}
                />
                <Textarea
                  label="Description"
                  name="description"
                  value={job?.description}
                  required
                />
                <Select
                  label="Status"
                  name="status"
                  value={job?.status || "DRAFT"}
                  options={jobStatuses}
                />
                <Select
                  label="Work mode"
                  name="workMode"
                  value={job?.workMode || "ONSITE"}
                  options={workModes}
                />
                <Field label="Location" name="location" value={job?.location} />
                <Field
                  label="Application deadline (your local time)"
                  name="applicationDeadline"
                  type="datetime-local"
                  value={localDeadline}
                />
                <Field
                  label="Minimum compensation"
                  name="compensationMin"
                  type="number"
                  min={0}
                  step={1}
                  value={job?.compensationMin}
                />
                <Field
                  label="Maximum compensation"
                  name="compensationMax"
                  type="number"
                  min={0}
                  step={1}
                  value={job?.compensationMax}
                />
                <Field
                  label="Currency"
                  name="compensationCurrency"
                  value={job?.compensationCurrency || "INR"}
                  required
                  maxLength={10}
                />
                <Select
                  label="Compensation period (optional)"
                  name="compensationPeriod"
                  value={job?.compensationPeriod || ""}
                  options={["", ...compensationPeriods]}
                />
                <Field
                  label="Minimum CGPA (0–10)"
                  name="minCgpa"
                  type="number"
                  min={0}
                  max={10}
                  step="0.01"
                  value={job?.minCgpa}
                />
                <Field
                  label="Maximum active backlogs"
                  name="maxActiveBacklogs"
                  type="number"
                  min={0}
                  step={1}
                  value={job?.maxActiveBacklogs}
                />
                <Field
                  label="Minimum 10th percentage"
                  name="minTenthPercentage"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={job?.minTenthPercentage}
                />
                <Field
                  label="Minimum 12th percentage"
                  name="minTwelfthPercentage"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={job?.minTwelfthPercentage}
                />
                <Field
                  label="Eligible branches (comma separated; blank for all)"
                  name="eligibleBranches"
                  value={job?.eligibleBranches.join(", ")}
                />
                <Field
                  label="Graduation years (comma separated; blank for all)"
                  name="graduationYears"
                  value={job?.graduationYears.join(", ")}
                />
              </div>
              <div className="actions">
                <button>{busy ? "Saving…" : "Save opportunity"}</button>
                <Link
                  className="button secondary"
                  href={job ? `/dashboard/jobs/${job.id}` : "/dashboard/jobs"}
                >
                  Cancel
                </Link>
              </div>
            </fieldset>
          </form>
        )
      )}
      {job && (
        <div className="card">
          <h2>Delete opportunity</h2>
          <p>
            Closing the job preserves its application history. Deleting
            permanently removes its applications too.
          </p>
          <button
            className="danger"
            disabled={busy}
            onClick={() => void remove()}
          >
            Delete job
          </button>
        </div>
      )}
    </>
  );
}
