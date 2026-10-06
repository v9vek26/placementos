"use client";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/workspace";
import { Empty, Heading, State, useResource } from "@/components/ui";
import { JobCard, JobTable } from "@/components/product";
import type { Job } from "@/lib/types";
export default function JobsPage() {
  const user = useSession();
  const resource = useResource<Job[]>("/jobs");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState(user.role === "RECRUITER" ? "own" : "all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const jobs = resource.data?.filter(
    (job) =>
      `${job.title} ${job.company.name} ${job.location || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (scope !== "own" || job.recruiter?.userId === user.userId) &&
      (type === "all" || job.type === type) &&
      (status === "all" || job.status === status),
  );
  return (
    <>
      <Heading
        title={
          user.role === "STUDENT"
            ? "Find your next opportunity"
            : "Jobs workspace"
        }
        description="Real opportunities. Clear requirements. One place to take the next step."
      >
        {user.role !== "STUDENT" && (
          <Link className="button" href="/dashboard/jobs/new">
            + Create job
          </Link>
        )}
      </Heading>
      <div className="toolbar">
        <input
          aria-label="Search jobs"
          placeholder="Search by title, company, or location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Job type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="JOB">Jobs</option>
          <option value="INTERNSHIP">Internships</option>
        </select>
        {user.role === "RECRUITER" && (
          <select
            aria-label="Job ownership"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="own">My jobs</option>
            <option value="all">All visible jobs</option>
          </select>
        )}
        {user.role !== "STUDENT" && (
          <select
            aria-label="Job status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {["DRAFT", "OPEN", "CLOSED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
      </div>
      <State {...resource} retry={resource.reload} />
      {!resource.error && jobs?.length === 0 && (
        <Empty>
          No jobs match this view. Try another filter
          {user.role !== "STUDENT"
            ? " or create your first opportunity."
            : " or check back for new opportunities."}
          <div className="actions">
            <button
              className="secondary"
              onClick={() => {
                setSearch("");
                setType("all");
                setStatus("all");
              }}
            >
              Clear filters
            </button>
          </div>
        </Empty>
      )}
      {jobs && !resource.error && (
        <p className="result-count" role="status">
          {jobs.length} {jobs.length === 1 ? "opportunity" : "opportunities"} in
          this view
        </p>
      )}
      {user.role === "STUDENT"
        ? jobs?.map((job) => <JobCard job={job} key={job.id} />)
        : jobs && jobs.length > 0 && <JobTable jobs={jobs} />}
    </>
  );
}
