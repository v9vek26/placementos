import Link from "next/link";
import { Badge, date } from "./ui";
import { companyIdentity, compensation } from "@/lib/presentation";
import type { Job } from "@/lib/types";

export function Icon({ name = "grid" }: { name?: string }) {
  const paths: Record<string, string> = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    jobs: "M8 7V4h8v3 M3 7h18v14H3z M3 12c6 4 12 4 18 0 M10 13h4",
    people:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.9",
    profile: "M20 21v-2a7 7 0 0 0-14 0v2 M13 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    building: "M4 21V3h12v18 M16 9h4v12 M8 7h4 M8 11h4 M8 15h4 M2 21h20",
    arrow: "M5 12h14 M13 6l6 6-6 6",
    check: "M5 12l4 4L19 6",
    clock: "M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  };
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}

export function CompanyMark({ name, id }: { name: string; id?: string }) {
  const { initials, tone } = companyIdentity(name, id);
  return (
    <span aria-hidden="true" className={`company-mark tone-${tone}`}>
      {initials}
    </span>
  );
}

export function MetricCard({
  title,
  value,
  detail,
  icon = "grid",
}: {
  title: string;
  value: number | string;
  detail: string;
  icon?: string;
}) {
  return (
    <article className="card metric-card">
      <div className="metric-label">
        <span>{title}</span>
        <Icon name={icon} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function JobCard({ job }: { job: Job }) {
  return (
    <article className="card job-card">
      <div className="row">
        <div className="identity">
          <CompanyMark name={job.company.name} id={job.companyId} />
          <div>
            <p className="company-name">{job.company.name}</p>
            <h2>
              <Link href={`/dashboard/jobs/${job.id}`}>{job.title}</Link>
            </h2>
          </div>
        </div>
        <Badge value={job.status} />
      </div>
      <div className="metadata">
        <Badge value={job.type} />
        <span>{job.location || "Location not specified"}</span>
        <Badge value={job.workMode} />
        <span className="compensation">{compensation(job)}</span>
      </div>
      <p className="job-excerpt">
        {job.description.slice(0, 180)}
        {job.description.length > 180 ? "…" : ""}
      </p>
      <div className="job-footer">
        <span className="deadline">
          <Icon name="clock" />
          {job.applicationDeadline
            ? `Apply by ${date(job.applicationDeadline)}`
            : "No deadline listed"}
        </span>
        <Link className="text-link" href={`/dashboard/jobs/${job.id}`}>
          View opportunity <Icon name="arrow" />
        </Link>
      </div>
    </article>
  );
}

export function SectionHeading({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {href && (
        <Link className="text-link" href={href}>
          {action || "View all"} →
        </Link>
      )}
    </div>
  );
}

export function JobTable({ jobs }: { jobs: Job[] }) {
  return (
    <div
      className="table-wrap"
      role="region"
      aria-label="Job directory"
      tabIndex={0}
    >
      <table className="responsive-table">
        <caption className="sr-only">Visible opportunities</caption>
        <thead>
          <tr>
            <th scope="col">Opportunity</th>
            <th scope="col">Work &amp; compensation</th>
            <th scope="col">Status</th>
            <th scope="col">Deadline</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <div className="identity">
                  <CompanyMark name={job.company.name} id={job.companyId} />
                  <div>
                    <strong>{job.title}</strong>
                    <p className="company-name">{job.company.name}</p>
                  </div>
                </div>
              </td>
              <td data-label="Work & compensation">
                <p>
                  {job.location || "Location not specified"} ·{" "}
                  {job.workMode.toLowerCase()}
                </p>
                <small>{compensation(job)}</small>
                <div>
                  <Badge value={job.type} />
                </div>
              </td>
              <td data-label="Status">
                <Badge value={job.status} />
              </td>
              <td data-label="Deadline">{date(job.applicationDeadline)}</td>
              <td>
                <Link
                  className="text-link"
                  href={"/dashboard/jobs/" + job.id}
                  aria-label={`View job: ${job.title}`}
                >
                  View job →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
