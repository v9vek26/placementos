import assert from "node:assert/strict";
import { test } from "node:test";
import { publicApiOrigin } from "../lib/public-config.mjs";
import { contentSecurityPolicy } from "../lib/content-security-policy.mjs";

const nonce = "0123456789abcdef0123456789abcdef";
test("public API configuration preserves the local fallback and canonical origins", () => {
  assert.equal(publicApiOrigin(undefined), "http://localhost:4000");
  assert.equal(
    publicApiOrigin("https://api.example.invalid/"),
    "https://api.example.invalid",
  );
});
test("public configuration rejects credentials, paths, fragments and non-HTTP URLs without echoing them", () => {
  for (const input of [
    "invalid",
    "javascript:alert(1)",
    "https://user:secret@example.invalid",
    "https://api.example.invalid/api",
    "https://api.example.invalid?token=secret",
    "https://api.example.invalid/#secret",
    "https://api.example.invalid\r\n",
  ]) {
    assert.throws(
      () => publicApiOrigin(input),
      (error) => {
        assert.equal(error.message.includes("secret"), false);
        return true;
      },
    );
  }
});
test("production policy requires script nonces and restricts browser connections", () => {
  const policy = contentSecurityPolicy({
    nonce,
    apiUrl: "https://api.example.invalid",
  });
  assert.ok(
    policy.includes(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`),
  );
  assert.ok(policy.includes("connect-src 'self' https://api.example.invalid"));
  assert.ok(policy.includes("object-src 'none'"));
  assert.ok(policy.includes("base-uri 'none'"));
  assert.ok(policy.includes("frame-ancestors 'none'"));
  assert.equal(policy.includes("unsafe-eval"), false);
  assert.equal(policy.includes(" ws:"), false);
  assert.equal(policy.includes("upgrade-insecure-requests"), false); // Local production smoke builds still use HTTP.
});
test("development permits the React debugger and hot-reload sockets", () => {
  const policy = contentSecurityPolicy({
    nonce,
    apiUrl: undefined,
    development: true,
  });
  assert.ok(policy.includes("'unsafe-eval'"));
  assert.ok(policy.includes("ws: wss:"));
  assert.ok(policy.includes("http://localhost:4000"));
});
test("policy rejects nonce/header injection and untrusted API paths", () => {
  assert.throws(() =>
    contentSecurityPolicy({ nonce: "bad'; script-src *", apiUrl: undefined }),
  );
  assert.throws(() =>
    contentSecurityPolicy({
      nonce,
      apiUrl: "https://api.example.invalid/;script-src",
    }),
  );
});
