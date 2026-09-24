"use client";
import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";

export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value);
          setError("");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(e));
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [path, version]);
  return { data, setData, error, loading, reload };
}
export function State({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (error)
    return (
      <div className="notice error" role="alert">
        {error}{" "}
        <button className="secondary" onClick={retry}>
          Try again
        </button>
      </div>
    );
  if (loading)
    return (
      <p className="card" role="status">
        Loading…
      </p>
    );
  return null;
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">PLACEMENTOS / WORKSPACE</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Notice({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="notice success" role="status">
          {success}
        </p>
      )}
    </>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card empty">{children}</div>;
}
export function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge status-${value.toLowerCase()}`}>
      {label(value)}
    </span>
  );
}
export function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "No deadline";
}
export function safeUrl(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function Field({
  label: title,
  name,
  value,
  ...props
}: { label: string; name: string; value?: string | number | null } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value"
>) {
  return (
    <label className="field">
      {title}
      <input name={name} defaultValue={value ?? ""} {...props} />
    </label>
  );
}
export function Select({
  label: title,
  name,
  value,
  options,
  ...props
}: {
  label: string;
  name: string;
  value?: string;
  options: readonly string[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="field">
      {title}
      <select name={name} defaultValue={value} {...props}>
        {options.map((option) => (
          <option key={option} value={option}>
            {label(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Textarea({
  label: title,
  name,
  value,
  ...props
}: { label: string; name: string; value?: string | null } & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value"
>) {
  return (
    <label className="field wide">
      {title}
      <textarea name={name} defaultValue={value ?? ""} rows={5} {...props} />
    </label>
  );
}
export function formBody(
  form: HTMLFormElement,
  numbers: string[] = [],
  arrays: string[] = [],
  nullable: string[] = [],
) {
  const body: Record<string, unknown> = {};
  new FormData(form).forEach((raw, key) => {
    const value = String(raw).trim();
    if (arrays.includes(key))
      body[key] = value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    else if (value === "") {
      if (nullable.includes(key)) body[key] = null;
    } else body[key] = numbers.includes(key) ? Number(value) : value;
  });
  return body;
}
