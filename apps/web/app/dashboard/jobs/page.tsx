"use client";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/workspace";
import {
  Badge,
  date,
  Empty,
  Heading,
  State,
  useResource,
} from "@/components/ui";
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
        </Empty>
      )}
      {jobs?.map((job) => (
        <article className="card" key={job.id}>
          <div className="row">
            <div>
              <p className="eyebrow">{job.company.name}</p>
              <h2>
                <Link href={`/dashboard/jobs/${job.id}`}>{job.title}</Link>
              </h2>
              <div className="metadata">
                <Badge value={job.type} />
                <span>{job.location || "Location not specified"}</span>
                <Badge value={job.workMode} />
              </div>
            </div>
            <Badge value={job.status} />
          </div>
          <p>
            {job.description.slice(0, 220)}
            {job.description.length > 220 ? "…" : ""}
          </p>
          <div className="row">
            <small>Deadline: {date(job.applicationDeadline)}</small>
            <Link className="text-link" href={`/dashboard/jobs/${job.id}`}>
              View opportunity →
            </Link>
          </div>
        </article>
      ))}
    </>
  );
}
