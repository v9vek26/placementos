"use client";
import { useState } from "react";
import {
  Empty,
  Field,
  formBody,
  Heading,
  Notice,
  safeUrl,
  State,
  Textarea,
  useResource,
} from "@/components/ui";
import { errorMessage, write } from "@/lib/api";
import type { Company } from "@/lib/types";
export default function CompaniesPage() {
  const resource = useResource<Company[]>("/companies");
  const [editing, setEditing] = useState<Company | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const company = editing && editing !== "new" ? editing : undefined;
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const saved = await write<Company>(
        company ? `/companies/${company.id}` : "/companies",
        company ? "PATCH" : "POST",
        formBody(
          event.currentTarget,
          [],
          [],
          company ? ["website", "industry", "location", "description"] : [],
        ),
      );
      resource.setData((items) =>
        company
          ? items?.map((i) => (i.id === saved.id ? saved : i)) || []
          : [saved, ...(items || [])],
      );
      setEditing(null);
      setSuccess("Company saved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: Company) {
    if (
      !window.confirm(
        `Permanently delete ${item.name}? This also deletes its recruiter profiles, jobs, and all applications to those jobs. User accounts remain. This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await write(`/companies/${item.id}`, "DELETE");
      resource.setData((items) => items?.filter((i) => i.id !== item.id) || []);
      setSuccess("Company deleted.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const companies = resource.data?.filter((c) =>
    `${c.name} ${c.industry || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        title="Companies"
        description="Build and maintain your campus hiring network."
      >
        <button
          onClick={() => {
            setEditing("new");
            setError("");
            setSuccess("");
          }}
          disabled={busy}
        >
          + Add company
        </button>
      </Heading>
      <Notice error={error} success={success} />
      {editing && (
        <form className="card" onSubmit={save} key={company?.id || "new"}>
          <fieldset disabled={busy}>
            <legend>{company ? "Edit company" : "New company"}</legend>
            <div className="form-grid">
              <Field
                label="Company name"
                name="name"
                value={company?.name}
                minLength={2}
                maxLength={100}
                required
              />
              <Field
                label="Website"
                name="website"
                type="url"
                pattern="https?://.*"
                value={company?.website}
              />
              <Field
                label="Industry"
                name="industry"
                maxLength={100}
                value={company?.industry}
              />
              <Field
                label="Location"
                name="location"
                maxLength={100}
                value={company?.location}
              />
              <Textarea
                label="Description"
                name="description"
                maxLength={1000}
                value={company?.description}
              />
            </div>
            <div className="actions">
              <button>{busy ? "Saving…" : "Save company"}</button>
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
          aria-label="Search companies"
          placeholder="Search companies"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <State {...resource} retry={resource.reload} />
      {companies?.length === 0 && <Empty>No companies match this view.</Empty>}
      {companies?.map((item) => (
        <article className="card" key={item.id}>
          <div className="row">
            <div>
              <h2>{item.name}</h2>
              <p>
                {[item.industry, item.location].filter(Boolean).join(" · ")}
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
          <p className="prose">{item.description}</p>
          {safeUrl(item.website) && (
            <a
              href={safeUrl(item.website)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit website ↗
            </a>
          )}
        </article>
      ))}
    </>
  );
}
