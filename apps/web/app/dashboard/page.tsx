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
import {
  CompanyMark,
  Icon,
  JobCard,
  MetricCard,
  SectionHeading,
} from "@/components/product";
import { profileCompleteness, upcomingJobs } from "@/lib/presentation";
import type {
  Application,
  Company,
  Job,
  Recruiter,
  Student,
  User,
} from "@/lib/types";

export default function DashboardPage() {
  const user = useSession();
  return user.role === "STUDENT" ? (
    <StudentOverview />
  ) : user.role === "RECRUITER" ? (
    <RecruiterOverview />
  ) : (
    <AdminOverview />
  );
}

function ApplicationSummary({ student = false }: { student?: boolean }) {
  const resource = useResource<Application[]>("/applications");
  const items = resource.error ? null : resource.data;
  return (
    <>
      <State {...resource} retry={resource.reload} />
      {items && (
        <>
          <section className="stats" aria-label="Application summary">
            <MetricCard
              title={student ? "Your applications" : "Total applicants"}
              value={items.length}
              detail="Across your visible applications"
              icon="people"
            />
            <MetricCard
              title="Active applications"
              value={
                items.filter((a) =>
                  ["APPLIED", "UNDER_REVIEW", "SHORTLISTED"].includes(a.status),
                ).length
              }
              detail="Applied, in review or shortlisted"
              icon="clock"
            />
            <MetricCard
              title="Selected"
              value={items.filter((a) => a.status === "SELECTED").length}
              detail="Current selection status"
              icon="check"
            />
          </section>
          <section className="card">
            <SectionHeading
              title={
                student ? "Your latest applications" : "Applicant pipeline"
              }
              description={
                student
                  ? "Current status, always in one place."
                  : "A snapshot of current statuses across your applicants."
              }
              href="/dashboard/applications"
              action={student ? "Track applications" : "Review applicants"}
            />
            {student ? (
              items.length ? (
                <div className="activity-list">
                  {[...items]
                    .sort(
                      (a, b) =>
                        Date.parse(b.appliedAt) - Date.parse(a.appliedAt),
                    )
                    .slice(0, 4)
                    .map((a) => (
                      <div className="activity-row" key={a.id}>
                        <div className="identity">
                          <CompanyMark
                            name={a.job.company.name}
                            id={a.job.companyId}
                          />
                          <div>
                            <strong>{a.job.title}</strong>
                            <p>
                              {a.job.company.name} · Applied {date(a.appliedAt)}
                            </p>
                          </div>
                        </div>
                        <Badge value={a.status} />
                      </div>
                    ))}
                </div>
              ) : (
                <p>
                  No applications yet.{" "}
                  <Link href="/dashboard/jobs">
                    Find your first opportunity →
                  </Link>
                </p>
              )
            ) : (
              <div className="pipeline">
                {[
                  "APPLIED",
                  "UNDER_REVIEW",
                  "SHORTLISTED",
                  "SELECTED",
                  "REJECTED",
                  "WITHDRAWN",
                ].map((status) => (
                  <div key={status}>
                    <Badge value={status} />
                    <strong>
                      {items.filter((a) => a.status === status).length}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function StudentOverview() {
  const user = useSession();
  const profiles = useResource<Student[]>("/student-profiles");
  const jobs = useResource<Job[]>("/jobs");
  const [now] = useState(() => Date.now());
  const profile = profiles.data?.find((p) => p.userId === user.userId);
  const complete = profileCompleteness(profile);
  const deadlines = upcomingJobs(jobs.data || [], now).slice(0, 3);
  return (
    <>
      <Heading
        title={
          profile
            ? `Welcome back, ${profile.fullName.split(" ")[0]}`
            : "Your next chapter starts here"
        }
        description="A little preparation. A world of possibility."
      >
        <Link className="button" href="/dashboard/jobs">
          Explore opportunities <Icon name="arrow" />
        </Link>
      </Heading>
      <div className="overview-grid">
        <section className="hero">
          <p className="eyebrow">YOUR CAREER, IN MOTION</p>
          <h2>
            Make room for <br />
            what comes next.
          </h2>
          <p>
            Find a role that fits your ambitions. Understand the requirements
            and take your next step with confidence.
          </p>
          <Link className="button secondary" href="/dashboard/jobs">
            Find your next role <Icon name="arrow" />
          </Link>
        </section>
        <section className="card profile-summary">
          <div className="metric-label">
            <h2>Ready to stand out?</h2>
            <Icon name="profile" />
          </div>
          <State {...profiles} retry={profiles.reload} />
          {profiles.data && !profiles.error && (
            <>
              <strong className="completion-value">
                {complete.completed * 10}
                <span>%</span>
              </strong>
              <label htmlFor="profile-completion">Profile completeness</label>
              <progress
                id="profile-completion"
                value={complete.completed}
                max={complete.total}
              />
              <p>
                {complete.missing.length
                  ? `Next: add ${complete.missing.slice(0, 3).join(", ").toLowerCase()}.`
                  : "Your profile fields are complete. Keep them current."}
              </p>
              <small>
                {complete.completed} of {complete.total} fields provided. This
                is a checklist, not an eligibility score.
              </small>
              <Link className="text-link" href="/dashboard/profile">
                {profile ? "Update your profile" : "Build your profile"} →
              </Link>
            </>
          )}
        </section>
      </div>
      <ApplicationSummary student />
      <SectionHeading
        title="Closing soon"
        description="Upcoming deadlines for open opportunities. Check eligibility on each role."
        href="/dashboard/jobs"
        action="Browse all jobs"
      />
      <State {...jobs} retry={jobs.reload} />
      {!jobs.error &&
        jobs.data &&
        (deadlines.length ? (
          deadlines.map((job) => <JobCard key={job.id} job={job} />)
        ) : (
          <Empty>
            No upcoming deadlines listed.{" "}
            <Link href="/dashboard/jobs">Browse all open opportunities →</Link>
          </Empty>
        ))}
    </>
  );
}

function RecruiterOverview() {
  const user = useSession();
  const profiles = useResource<Recruiter[]>("/recruiters");
  const jobs = useResource<Job[]>("/jobs");
  const profile = profiles.data?.find((p) => p.userId === user.userId);
  const owned = jobs.data?.filter(
    (job) => job.recruiter?.userId === user.userId,
  );
  return (
    <>
      <Heading
        title={
          profile
            ? `Welcome back, ${profile.fullName.split(" ")[0]}`
            : "Your hiring workspace"
        }
        description="Turn today's applicants into tomorrow's team."
      >
        <Link className="button" href="/dashboard/jobs/new">
          + Create opportunity
        </Link>
      </Heading>
      <section className="hero compact-hero">
        <p className="eyebrow">BUILD YOUR NEXT GREAT TEAM</p>
        <h2>A clearer view of your hiring.</h2>
        <p>
          Manage open roles, review profiles, and keep every applicant moving
          forward.
        </p>
        {profile && (
          <div className="identity">
            <CompanyMark name={profile.company.name} id={profile.companyId} />
            <strong>{profile.company.name}</strong>
          </div>
        )}
      </section>
      <State {...profiles} retry={profiles.reload} />
      {profiles.data && !profile && !profiles.error && (
        <Empty>
          Your recruiter profile is not set up. Ask an administrator to link
          your account to a company before posting jobs.
        </Empty>
      )}
      <State {...jobs} retry={jobs.reload} />
      {owned && !jobs.error && (
        <section className="stats" aria-label="Your jobs">
          {["OPEN", "DRAFT", "CLOSED"].map((status) => (
            <MetricCard
              key={status}
              title={`${status === "OPEN" ? "Open" : status === "DRAFT" ? "Draft" : "Closed"} jobs`}
              value={owned.filter((job) => job.status === status).length}
              detail="Only opportunities you own"
              icon="jobs"
            />
          ))}
        </section>
      )}
      <ApplicationSummary />
      <SectionHeading
        title="Your opportunities"
        href="/dashboard/jobs"
        action="Manage jobs"
      />
      {!jobs.error &&
        owned &&
        (owned.length ? (
          owned.slice(0, 3).map((job) => <JobCard key={job.id} job={job} />)
        ) : (
          <Empty>
            You have no jobs yet.{" "}
            <Link href="/dashboard/jobs/new">Create an opportunity →</Link>
          </Empty>
        ))}
    </>
  );
}

function AdminOverview() {
  const users = useResource<User[]>("/users");
  const companies = useResource<Company[]>("/companies");
  const recruiters = useResource<Recruiter[]>("/recruiters");
  const jobs = useResource<Job[]>("/jobs");
  const unassigned =
    users.data && recruiters.data && !users.error && !recruiters.error
      ? users.data.filter(
          (user) =>
            user.role === "RECRUITER" &&
            !recruiters.data!.some((r) => r.userId === user.id),
        )
      : null;
  return (
    <>
      <Heading
        title="Campus overview"
        description="Your people, hiring network, and opportunities in one place."
      >
        <Link className="button" href="/admin/recruiters">
          + Onboard recruiter
        </Link>
      </Heading>
      <section className="hero compact-hero">
        <p className="eyebrow">CONNECTED CAMPUS. CLEARER POSSIBILITIES.</p>
        <h2>Keep your hiring community moving.</h2>
        <p>
          Manage access, connect companies, and give your recruiters the
          foundation to hire.
        </p>
      </section>
      <section className="stats" aria-label="Campus summary">
        {[
          {
            title: "Campus accounts",
            resource: users,
            detail: "Registered users",
            icon: "people",
          },
          {
            title: "Companies",
            resource: companies,
            detail: "Your hiring network",
            icon: "building",
          },
          {
            title: "Recruiter profiles",
            resource: recruiters,
            detail: "Linked to companies",
            icon: "profile",
          },
        ].map(({ title, resource, detail, icon }) => (
          <div key={title}>
            <MetricCard
              title={title}
              value={
                resource.error ? "Unavailable" : (resource.data?.length ?? "…")
              }
              detail={detail}
              icon={icon}
            />
            <State {...resource} retry={resource.reload} />
          </div>
        ))}
      </section>
      {users.data && !users.error && (
        <div className="role-breakdown">
          {["STUDENT", "RECRUITER", "ADMIN"].map((role) => (
            <span key={role}>
              <Badge value={role} />{" "}
              {users.data!.filter((u) => u.role === role).length}
            </span>
          ))}
        </div>
      )}
      {unassigned && unassigned.length > 0 && (
        <div className="notice warning">
          {unassigned.length} recruiter account(s) still need a company profile.{" "}
          <Link href="/admin/recruiters">Finish onboarding →</Link>
        </div>
      )}
      {companies.data?.length === 0 && !companies.error && (
        <div className="notice warning">
          Add a company before onboarding recruiters.{" "}
          <Link href="/admin/companies">Manage companies →</Link>
        </div>
      )}
      {users.data &&
        !users.error &&
        users.data.filter((u) => u.role === "ADMIN").length === 1 && (
          <div className="notice warning">
            There is one administrator account. Review access continuity with
            your campus team.
          </div>
        )}
      <section className="cards">
        {[
          [
            "people",
            "Manage access",
            "Review campus accounts and roles.",
            "/admin/users",
          ],
          [
            "building",
            "Hiring network",
            "Maintain companies and their details.",
            "/admin/companies",
          ],
          [
            "profile",
            "Recruiter onboarding",
            "Connect accounts to their companies.",
            "/admin/recruiters",
          ],
        ].map(([icon, title, description, href]) => (
          <Link className="card action-card" href={href} key={href}>
            <span className="action-icon">
              <Icon name={icon} />
            </span>
            <h2>{title}</h2>
            <p>{description}</p>
            <span className="text-link">Open workspace →</span>
          </Link>
        ))}
      </section>
      <SectionHeading
        title="Opportunity status"
        description="Current jobs across the campus."
        href="/dashboard/jobs"
        action="Manage jobs"
      />
      <State {...jobs} retry={jobs.reload} />
      {jobs.data && !jobs.error && (
        <section className="stats">
          {["OPEN", "DRAFT", "CLOSED"].map((status) => (
            <MetricCard
              key={status}
              title={`${status === "OPEN" ? "Open" : status === "DRAFT" ? "Draft" : "Closed"} jobs`}
              value={jobs.data!.filter((job) => job.status === status).length}
              detail="Campus-wide opportunities"
              icon="jobs"
            />
          ))}
        </section>
      )}
      <ApplicationSummary />
    </>
  );
}
