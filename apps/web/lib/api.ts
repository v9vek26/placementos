export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function clearSession() {
  localStorage.removeItem("placementos_token");
  localStorage.removeItem("placementos_user");
}

export function signOut() {
  clearSession();
  window.location.replace("/login");
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (authenticated) {
    const token = localStorage.getItem("placementos_token");
    if (!token) {
      signOut();
      throw new ApiError("Please sign in.", 401);
    }
    headers.set("Authorization", `Bearer ${token}`);
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError(
      "Unable to reach PlacementOS. Check your connection and try again.",
      0,
    );
  }
  if (response.status === 401 && authenticated) {
    signOut();
    throw new ApiError("Your session expired. Please sign in again.", 401);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message;
    const reasons = Array.isArray(body?.reasons)
      ? ` ${body.reasons.join(" ")}`
      : "";
    throw new ApiError(
      `${message || `Request failed (${response.status}).`}${reasons}`,
      response.status,
    );
  }
  return body as T;
}

export function write<T>(path: string, method: string, data?: unknown) {
  return api<T>(path, {
    method,
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
