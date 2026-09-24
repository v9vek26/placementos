"use client";
import Link from "next/link";
import { useSession } from "@/components/workspace";
import { Heading, State, useResource } from "@/components/ui";
import type { Application } from "@/lib/types";
export default function DashboardPage() {
  const user = useSession();
  const applications = useResource<Application[]>("/applications");
  const student = user.role === "STUDENT";
  const cards = student
    ? [
        [
          "01",
          "Build your profile",
          "Keep your academics, skills, and resume ready for your next opportunity.",
          "/dashboard/profile",
        ],
        [
          "02",
          "Find your next opportunity",
          "Explore open roles and see exactly where you meet the requirements.",
          "/dashboard/jobs",
        ],
        [
          "03",
          "Follow your progress",
          "Track every application from submission to selection.",
          "/dashboard/applications",
        ],
      ]
    : [
        [
          "01",
          "Manage opportunities",
          "Create and maintain roles, requirements, and application deadlines.",
          "/dashboard/jobs",
        ],
        [
          "02",
          "Review applicants",
          "Review student profiles and move applications forward.",
          "/dashboard/applications",
        ],
        ...(user.role === "ADMIN"
          ? [
              [
                "03",
                "Manage your campus",
                "Manage accounts, roles, companies, and recruiter onboarding.",
                "/admin/users",
              ],
            ]
          : [
              [
                "03",
                "Your recruiter profile",
                "Keep your professional details up to date.",
                "/dashboard/profile",
              ],
            ]),
      ];
  return (
    <>
      <Heading
        title={`${student ? "Student" : user.role === "ADMIN" ? "Admin" : "Recruiter"} workspace`}
        description="A clear view of what comes next."
      />
      <section className="hero">
        <p className="eyebrow">MAKE YOUR NEXT MOVE</p>
        <h2>
          {student
            ? "Your ambition. Your next chapter."
            : "Great opportunities start with the right connection."}
        </h2>
        <p>
          {student
            ? "Discover opportunities, understand your eligibility, and apply with confidence."
            : "Bring talent and opportunity together in one focused workspace."}
        </p>
        <Link className="button" href="/dashboard/jobs">
          {student ? "Explore opportunities" : "Open jobs workspace"} →
        </Link>
      </section>
      <State {...applications} retry={applications.reload} />
      {applications.data && (
        <section className="stats" aria-label="Application summary">
          {[
            ["Applications", applications.data.length],
            [
              "In review",
              applications.data.filter((a) =>
                ["UNDER_REVIEW", "SHORTLISTED"].includes(a.status),
              ).length,
            ],
            [
              "Selected",
              applications.data.filter((a) => a.status === "SELECTED").length,
            ],
          ].map(([name, count]) => (
            <div className="card" key={name}>
              <span>{name}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </section>
      )}
      <section className="cards">
        {cards.map(([number, title, description, href]) => (
          <Link className="card action-card" href={href} key={href}>
            <span className="eyebrow">{number}</span>
            <h2>{title}</h2>
            <p>{description}</p>
            <span className="text-link">Get started →</span>
          </Link>
        ))}
      </section>
    </>
  );
}
