"use client";
import { JobEditor } from "@/components/job-form";
import { useSession } from "@/components/workspace";
export default function NewJobPage() {
  const user = useSession();
  return user.role === "STUDENT" ? (
    <p>Only recruiters and administrators can create jobs.</p>
  ) : (
    <JobEditor />
  );
}
