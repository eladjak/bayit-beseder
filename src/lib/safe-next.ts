/** Accept only a local path, including after one round of URL decoding. */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard"): string {
  const valid = (value: string) =>
    value.length <= 512 &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\u0000-\u001f\u007f]/.test(value) &&
    !value.slice(1).split("/")[0].includes("@");

  if (!raw || !valid(raw)) return fallback;
  try {
    return valid(decodeURIComponent(raw)) ? raw : fallback;
  } catch {
    return fallback;
  }
}
