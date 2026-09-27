/** Validate the public API address before using it in requests or CSP headers. */
export function publicApiOrigin(value) {
  const input = value || "http://localhost:4000";
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL must be an HTTP(S) origin.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    /[\r\n]/.test(input)
  ) {
    throw new Error(
      "NEXT_PUBLIC_API_URL must be an HTTP(S) origin without credentials, paths, query strings or fragments.",
    );
  }
  return url.origin;
}
