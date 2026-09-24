import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { api, ApiError } from "../lib/api.ts";
let values, redirects, requests;
beforeEach(() => {
  values = new Map([
    ["placementos_token", "fixture-token"],
    ["placementos_user", "{}"],
  ]);
  redirects = [];
  requests = [];
  globalThis.localStorage = {
    getItem: (k) => values.get(k),
    removeItem: (k) => values.delete(k),
  };
  globalThis.window = { location: { replace: (path) => redirects.push(path) } };
});
test("expired protected requests clear both cached session keys and redirect", async () => {
  globalThis.fetch = async () => new Response("{}", { status: 401 });
  await assert.rejects(
    api("/jobs"),
    (error) => error instanceof ApiError && error.status === 401,
  );
  assert.equal(values.size, 0);
  assert.deepEqual(redirects, ["/login"]);
});
test("missing token redirects without sending a request", async () => {
  values.delete("placementos_token");
  globalThis.fetch = async () => {
    throw new Error("Must not be called");
  };
  await assert.rejects(api("/applications"));
  assert.equal(values.size, 0);
  assert.deepEqual(redirects, ["/login"]);
});
test("public invalid login displays its error without redirecting", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "Invalid email or password." }), {
      status: 401,
    });
  await assert.rejects(
    api("/auth/login", {}, false),
    /Invalid email or password/,
  );
  assert.deepEqual(redirects, []);
});
test("forbidden requests preserve session and show authorization error", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });
  await assert.rejects(api("/users"), /Forbidden/);
  assert.equal(values.size, 2);
  assert.deepEqual(redirects, []);
});
test("requests carry bearer token and body content type without caching", async () => {
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return Response.json({ id: "fixture" });
  };
  assert.deepEqual(await api("/jobs", { method: "POST", body: "{}" }), {
    id: "fixture",
  });
  assert.equal(
    requests[0].options.headers.get("Authorization"),
    "Bearer fixture-token",
  );
  assert.equal(
    requests[0].options.headers.get("Content-Type"),
    "application/json",
  );
  assert.equal(requests[0].options.cache, "no-store");
});
test("network errors preserve session and provide a retryable message", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  await assert.rejects(api("/jobs"), /Unable to reach PlacementOS/);
  assert.equal(values.size, 2);
  assert.deepEqual(redirects, []);
});
test("validation and eligibility reasons are presented together", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { message: ["Invalid profile"], reasons: ["CGPA must be at least 8."] },
      { status: 400 },
    );
  await assert.rejects(
    api("/applications"),
    /Invalid profile CGPA must be at least 8/,
  );
});
