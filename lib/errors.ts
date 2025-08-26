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
    type ErrorLike = { error?: unknown; message?: unknown };
    const obj = err as ErrorLike;
    if (typeof obj?.error === "string") return (obj.error as string) || fallback;
    if (typeof obj?.message === "string")
      return (obj.message as string) || fallback;
  } catch {
    // ignore
  }
  return fallback;
}
