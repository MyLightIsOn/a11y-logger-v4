export function normalizeErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!err) return fallback;
  // TanStack Query errors are often Error instances with message
  if (err instanceof Error) {
    // NetworkError or fetch TypeError messages normalization
    const msg = err.message || fallback;
    if (/Failed to fetch|NetworkError|Network Error|Load failed/i.test(msg)) {
      return "Network error. Please check your connection and try again.";
    }
    return msg;
  }
  if (typeof err === "string") return err || fallback;
  try {
    // Some APIs return { error: string }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = err as any;
    if (typeof anyErr?.error === "string") return anyErr.error || fallback;
    if (typeof anyErr?.message === "string") return anyErr.message || fallback;
  } catch {
    // ignore
  }
  return fallback;
}
