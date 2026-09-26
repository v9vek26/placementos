import assert from "node:assert/strict";
import { test } from "node:test";
import { deploymentOrigin, deploymentSmoke } from "./deployment-smoke.mjs";

const apiUrl = "https://api.example.invalid";
const webUrl = "https://web.example.invalid";
const secure = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "cache-control": "no-store",
};
function healthy(url, options) {
  if (url.endsWith("/users")) return new Response("{}", { status: 401 });
  if (options.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": webUrl,
        "access-control-allow-methods": "GET,POST",
        "access-control-allow-headers": "content-type,authorization",
      },
    });
  if (url.startsWith(webUrl))
    return new Response("<html></html>", {
      headers: { ...secure, "content-type": "text/html" },
    });
  return Response.json(
    { status: "ok", database: "connected" },
    { headers: secure },
  );
}
test("accepts only safe origins and explicit HTTP loopback", () => {
  assert.equal(deploymentOrigin(apiUrl), apiUrl);
  assert.equal(
    deploymentOrigin("http://localhost:4000", true),
    "http://localhost:4000",
  );
  for (const url of [
    "http://remote.example",
    "https://user:secret@example.invalid",
    `${apiUrl}/api`,
    `${apiUrl}?token=secret`,
    `${apiUrl}#fragment`,
    "invalid",
  ]) {
    assert.throws(() => deploymentOrigin(url, true));
  }
  assert.throws(() => deploymentOrigin("http://localhost:4000"));
});
test("healthy deployment passes using only anonymous GET/OPTIONS without redirects", async () => {
  const calls = [];
  const results = await deploymentSmoke({
    apiUrl,
    webUrl,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      assert.ok(["GET", "OPTIONS"].includes(options.method || "GET"));
      assert.equal(options.redirect, "manual");
      assert.equal(new Headers(options.headers).has("authorization"), false);
      assert.ok(options.signal instanceof AbortSignal);
      return healthy(url, options);
    },
  });
  assert.equal(calls.length, 5);
  assert.equal(results.length, 16);
  assert.ok(results.every((result) => result.passed));
});
test("detects unsafe anonymous access, wildcard CORS, and redirects", async () => {
  const results = await deploymentSmoke({
    apiUrl,
    webUrl,
    fetchImpl: async (url, options) => {
      if (url.endsWith("/users")) return new Response("{}", { status: 200 });
      if (options.headers?.Origin)
        return new Response(null, {
          status: 204,
          headers: { "access-control-allow-origin": "*" },
        });
      if (url.startsWith(webUrl))
        return new Response(null, {
          status: 302,
          headers: { location: "https://other.example.invalid" },
        });
      return healthy(url, options);
    },
  });
  for (const name of [
    "Protected users endpoint rejects anonymous access",
    "CORS permits the exact web origin",
    "CORS rejects an untrusted origin",
    "Web login HTTP 200",
  ]) {
    assert.equal(results.find((result) => result.name === name)?.passed, false);
  }
});
test("connection failures are contained, sanitized and do not skip other sections", async () => {
  let calls = 0;
  const results = await deploymentSmoke({
    apiUrl,
    webUrl,
    fetchImpl: async () => {
      calls++;
      throw new Error("sensitive backend detail");
    },
  });
  assert.equal(calls, 5);
  assert.equal(results.length, 5);
  assert.ok(results.every((result) => !result.passed));
  assert.equal(JSON.stringify(results).includes("sensitive"), false);
});
test("database outages and unexpectedly detailed health responses fail", async () => {
  const results = await deploymentSmoke({
    apiUrl,
    webUrl,
    fetchImpl: async (url, options) =>
      url === `${apiUrl}/`
        ? Response.json(
            { status: "error", database: "disconnected", accounts: 99 },
            { status: 503 },
          )
        : healthy(url, options),
  });
  assert.equal(
    results.find((result) => result.name === "Database connected").passed,
    false,
  );
  assert.equal(
    results.find(
      (result) => result.name === "Health response contains no account details",
    ).passed,
    false,
  );
});
