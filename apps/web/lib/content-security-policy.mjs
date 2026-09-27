import { publicApiOrigin } from "./public-config.mjs";

export function contentSecurityPolicy({ nonce, apiUrl, development = false }) {
  if (!/^[A-Za-z0-9+/=_-]{16,}$/.test(nonce))
    throw new Error("Invalid CSP nonce.");
  const origin = publicApiOrigin(apiUrl);
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    // Next/React can emit style attributes. Script execution still requires a nonce.
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${origin}${development ? " ws: wss:" : ""}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
  ].join("; ");
}
