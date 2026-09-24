"use client";
import { useParams } from "next/navigation";
import { JobEditor } from "@/components/job-form";
import { State, useResource } from "@/components/ui";
import type { Job } from "@/lib/types";
export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const resource = useResource<Job>(`/jobs/${id}`);
  return (
    <>
      <State {...resource} retry={resource.reload} />
      {resource.data && <JobEditor job={resource.data} />}
    </>
  );
}
