"use client";
import { useState } from "react";
import { useSession } from "@/components/workspace";
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
import type { Recruiter, Student } from "@/lib/types";
export default function ProfilePage() {
  const user = useSession();
  return (
    <>
      <Heading
        title="My profile"
        description="Keep your details accurate and ready for your next opportunity."
      />
      {user.role === "STUDENT" ? (
        <StudentProfile />
      ) : user.role === "RECRUITER" ? (
        <RecruiterProfile />
      ) : (
        <Empty>
          Manage accounts and recruiter profiles from the administration menu.
        </Empty>
      )}
    </>
  );
}
function StudentProfile() {
  const user = useSession();
  const resource = useResource<Student[]>("/student-profiles");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const profile = resource.data?.find((p) => p.userId === user.userId);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const body = formBody(
        event.currentTarget,
        [
          "cgpa",
          "graduationYear",
          "activeBacklogs",
          "tenthPercentage",
          "twelfthPercentage",
        ],
        ["skills"],
        profile
          ? ["cgpa", "tenthPercentage", "twelfthPercentage", "resumeUrl"]
          : [],
      );
      if (!profile) body.userId = user.userId;
      const result = await write<Student>(
        profile ? `/student-profiles/${profile.id}` : "/student-profiles",
        profile ? "PATCH" : "POST",
        body,
      );
      resource.setData([result]);
      setSuccess("Your profile has been saved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <State {...resource} retry={resource.reload} />
      <Notice error={error} success={success} />
      {resource.data && (
        <form className="card" onSubmit={save} key={profile?.id || "new"}>
          <fieldset disabled={busy}>
            <legend>Academic profile</legend>
            <div className="form-grid">
              <Field
                label="Full name"
                name="fullName"
                value={profile?.fullName}
                required
              />
              <Field
                label="College roll number"
                name="collegeRollNumber"
                value={profile?.collegeRollNumber}
                required
              />
              <Field
                label="Branch"
                name="branch"
                value={profile?.branch}
                required
              />
              <Field
                label="Graduation year"
                name="graduationYear"
                type="number"
                min={1900}
                max={2200}
                step={1}
                value={profile?.graduationYear}
                required
              />
              <Field
                label="CGPA (0–10)"
                name="cgpa"
                type="number"
                min={0}
                max={10}
                step="0.01"
                value={profile?.cgpa}
              />
              <Field
                label="Active backlogs"
                name="activeBacklogs"
                type="number"
                min={0}
                step={1}
                value={profile?.activeBacklogs ?? 0}
                required
              />
              <Field
                label="10th percentage"
                name="tenthPercentage"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={profile?.tenthPercentage}
              />
              <Field
                label="12th percentage"
                name="twelfthPercentage"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={profile?.twelfthPercentage}
              />
              <Field
                label="Skills (comma separated)"
                name="skills"
                value={profile?.skills.join(", ")}
              />
              <Field
                label="Resume URL (https://…)"
                name="resumeUrl"
                type="url"
                pattern="https?://.*"
                value={profile?.resumeUrl}
              />
            </div>
            <div className="actions">
              <button>{busy ? "Saving…" : "Save profile"}</button>
            </div>
          </fieldset>
        </form>
      )}
    </>
  );
}
function RecruiterProfile() {
  const resource = useResource<Recruiter[]>("/recruiters");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const profile = resource.data?.[0];
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      resource.setData([
        await write<Recruiter>(
          `/recruiters/${profile.id}`,
          "PATCH",
          formBody(event.currentTarget, [], [], ["jobTitle", "phone"]),
        ),
      ]);
      setSuccess("Your profile has been saved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <State {...resource} retry={resource.reload} />
      <Notice error={error} success={success} />
      {resource.data && !profile && (
        <Empty>
          Your recruiter profile has not been set up yet. Ask an administrator
          to link your account to a company.
        </Empty>
      )}
      {profile && (
        <form className="card" onSubmit={save}>
          <h2>{profile.company.name}</h2>
          <p>Your company membership is managed by an administrator.</p>
          <fieldset disabled={busy}>
            <div className="form-grid">
              <Field
                label="Full name"
                name="fullName"
                value={profile.fullName}
                required
                minLength={2}
                maxLength={100}
              />
              <Field
                label="Job title"
                name="jobTitle"
                value={profile.jobTitle}
                maxLength={100}
              />
              <Field
                label="Phone"
                name="phone"
                type="tel"
                value={profile.phone}
                maxLength={20}
              />
            </div>
            <div className="actions">
              <button>{busy ? "Saving…" : "Save profile"}</button>
            </div>
          </fieldset>
        </form>
      )}
    </>
  );
}
