"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Empty,
  Field,
  formBody,
  Heading,
  Notice,
  State,
  useResource,
} from "@/components/ui";
import { errorMessage, write } from "@/lib/api";
import type { Company, Recruiter, User } from "@/lib/types";
export default function RecruitersPage() {
  const resource = useResource<Recruiter[]>("/recruiters");
  const users = useResource<User[]>("/users");
  const companies = useResource<Company[]>("/companies");
  const [editing, setEditing] = useState<Recruiter | "new" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const profile = editing && editing !== "new" ? editing : undefined;
  const available = users.data?.filter(
    (u) =>
      u.role === "RECRUITER" && !resource.data?.some((r) => r.userId === u.id),
  );
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const saved = await write<Recruiter>(
        profile ? `/recruiters/${profile.id}` : "/recruiters",
        profile ? "PATCH" : "POST",
        formBody(
          event.currentTarget,
          [],
          [],
          profile ? ["jobTitle", "phone"] : [],
        ),
      );
      resource.setData((items) =>
        profile
          ? items?.map((i) => (i.id === saved.id ? saved : i)) || []
          : [saved, ...(items || [])],
      );
      setEditing(null);
      setSuccess("Recruiter profile saved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: Recruiter) {
    if (
      !window.confirm(
        `Delete ${item.fullName}'s recruiter profile? Their posted jobs and all applications to those jobs will also be permanently deleted. Their user account remains.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await write(`/recruiters/${item.id}`, "DELETE");
      resource.setData((items) => items?.filter((i) => i.id !== item.id) || []);
      setSuccess("Recruiter profile deleted.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const recruiters = resource.data?.filter((r) =>
    `${r.fullName} ${r.company.name} ${r.user.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        title="Recruiter management"
        description="Connect recruiter accounts to the companies they represent."
      >
        <button
          disabled={busy}
          onClick={() => {
            setEditing("new");
            setError("");
            setSuccess("");
          }}
        >
          + Onboard recruiter
        </button>
      </Heading>
      <p>
        Assign the Recruiter role in{" "}
        <Link href="/admin/users">User management</Link> before creating a
        profile. <Link href="/admin/companies">Add companies here.</Link>
      </p>
      <State {...resource} retry={resource.reload} />
      <State {...users} retry={users.reload} />
      <State {...companies} retry={companies.reload} />
      <Notice error={error} success={success} />
      {editing && users.data && companies.data && resource.data && (
        <form className="card" onSubmit={save} key={profile?.id || "new"}>
          <fieldset disabled={busy}>
            <legend>
              {profile ? `Edit ${profile.fullName}` : "Onboard a recruiter"}
            </legend>
            {!profile && available?.length === 0 && (
              <p className="notice">
                No unassigned recruiter accounts. Assign a user the Recruiter
                role first.
              </p>
            )}
            <div className="form-grid">
              {!profile && (
                <label className="field">
                  Recruiter account
                  <select name="userId" required>
                    <option value="">Choose account</option>
                    {available?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field">
                Company
                <select
                  name="companyId"
                  defaultValue={profile?.companyId || ""}
                  required
                >
                  <option value="">Choose company</option>
                  {companies.data.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Full name"
                name="fullName"
                value={profile?.fullName}
                required
                minLength={2}
                maxLength={100}
              />
              <Field
                label="Job title"
                name="jobTitle"
                value={profile?.jobTitle}
                maxLength={100}
              />
              <Field
                label="Phone"
                name="phone"
                value={profile?.phone}
                type="tel"
                maxLength={20}
              />
            </div>
            {profile && (
              <p>
                <small>
                  Changing company membership applies to future jobs. Existing
                  jobs retain their original company.
                </small>
              </p>
            )}
            <div className="actions">
              <button
                disabled={
                  !companies.data.length || (!profile && !available?.length)
                }
              >
                {busy ? "Saving…" : "Save recruiter"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}
      <div className="toolbar">
        <input
          aria-label="Search recruiters"
          placeholder="Search name, email, or company"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {recruiters?.length === 0 && (
        <Empty>No recruiters match this view.</Empty>
      )}
      {recruiters?.map((item) => (
        <article className="card" key={item.id}>
          <div className="row">
            <div>
              <h2>{item.fullName}</h2>
              <p>
                {item.jobTitle || "Recruiter"} · {item.company.name}
              </p>
              <p>
                {item.user.email} · {item.phone || "No phone provided"}
              </p>
            </div>
            <div className="actions">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setEditing(item);
                  setError("");
                  setSuccess("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Edit
              </button>
              <button
                className="danger"
                disabled={busy}
                onClick={() => void remove(item)}
              >
                Delete
              </button>
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
