import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

export function deploymentOrigin(value, allowLocal = false) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Supply API and web origins as valid URLs.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(allowLocal && local && url.protocol === "http:"))
  ) {
    throw new Error(
      "Use HTTPS origins without credentials, paths, query strings or fragments. --allow-local permits HTTP loopback origins only.",
    );
  }
  return url.origin;
}

// Only anonymous GET and OPTIONS requests. Never registers accounts or mutates data.
export async function deploymentSmoke({
  apiUrl,
  webUrl,
  allowLocal = false,
  fetchImpl = fetch,
}) {
  const api = deploymentOrigin(apiUrl, allowLocal);
  const web = deploymentOrigin(webUrl, allowLocal);
  const results = [];
  const check = (name, passed) =>
    results.push({ name, passed: Boolean(passed) });
  const get = async (url, options = {}) =>
    fetchImpl(url, {
      ...options,
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
  async function section(name, run) {
    try {
      await run();
    } catch {
      check(`${name}: connection, timeout or response failure`, false);
    }
  }
  await section("API health", async () => {
    const response = await get(`${api}/`);
    check("API health HTTP 200", response.status === 200);
    const body = await response.json();
    check(
      "Database connected",
      body.status === "ok" && body.database === "connected",
    );
    check(
      "Health response contains no account details",
      Object.keys(body).sort().join(",") === "database,status",
    );
    check(
      "API disables content sniffing",
      response.headers.get("x-content-type-options") === "nosniff",
    );
    check(
      "API blocks framing",
      response.headers.get("x-frame-options") === "DENY",
    );
    check(
      "API disables response caching",
      response.headers.get("cache-control")?.includes("no-store"),
    );
  });
  await section("Anonymous access", async () => {
    const response = await get(`${api}/users`);
    check(
      "Protected users endpoint rejects anonymous access",
      response.status === 401,
    );
    await response.body?.cancel();
  });
  await section("Allowed CORS origin", async () => {
    const response = await get(`${api}/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: web,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
      },
    });
    check(
      "CORS preflight succeeds",
      response.status === 204 || response.status === 200,
    );
    check(
      "CORS permits the exact web origin",
      response.headers.get("access-control-allow-origin") === web,
    );
    const methods = (response.headers.get("access-control-allow-methods") || "")
      .toUpperCase()
      .split(",")
      .map((v) => v.trim());
    check("CORS permits POST", methods.includes("POST"));
    const headers = (response.headers.get("access-control-allow-headers") || "")
      .toLowerCase()
      .split(",")
      .map((v) => v.trim());
    check(
      "CORS permits content-type and authorization",
      headers.includes("content-type") && headers.includes("authorization"),
    );
    await response.body?.cancel();
  });
  await section("Untrusted CORS origin", async () => {
    const untrusted =
      web === "https://untrusted.example.invalid"
        ? "https://other.example.invalid"
        : "https://untrusted.example.invalid";
    const response = await get(`${api}/`, { headers: { Origin: untrusted } });
    check(
      "CORS rejects an untrusted origin",
      !response.headers.has("access-control-allow-origin"),
    );
    await response.body?.cancel();
  });
  await section("Web login", async () => {
    const response = await get(`${web}/login`);
    check("Web login HTTP 200", response.status === 200);
    check(
      "Web serves HTML",
      response.headers.get("content-type")?.includes("text/html"),
    );
    check(
      "Web disables content sniffing",
      response.headers.get("x-content-type-options") === "nosniff",
    );
    check(
      "Web blocks framing",
      response.headers.get("x-frame-options") === "DENY",
    );
    await response.body?.cancel();
  });
  return results;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const { values } = parseArgs({
      options: {
        "api-url": { type: "string" },
        "web-url": { type: "string" },
        "allow-local": { type: "boolean", default: false },
        help: { type: "boolean", default: false },
      },
    });
    if (values.help) {
      console.log(
        "Usage: pnpm check:deployment --api-url https://API_HOST --web-url https://WEB_HOST [--allow-local]\nAnonymous, read-only health/CORS/access/header checks. Exit 0 means all checks passed; exit 1 means a failure. No account workflows are tested.",
      );
    } else {
      const results = await deploymentSmoke({
        apiUrl: values["api-url"],
        webUrl: values["web-url"],
        allowLocal: values["allow-local"],
      });
      for (const result of results)
        console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}`);
      process.exitCode = results.every((result) => result.passed) ? 0 : 1;
    }
  } catch {
    console.error(
      "Invalid deployment check arguments. Run pnpm check:deployment --help. URL credentials and response bodies are never printed.",
    );
    process.exitCode = 1;
  }
}
