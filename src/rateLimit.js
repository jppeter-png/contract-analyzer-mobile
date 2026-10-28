// The server answers 429 (with Retry-After) when the AI service is busy. Pure helpers, no React Native imports.

export const MAX_BUSY_RETRIES = 3;

export const isBusy = err => err?.response?.status === 429;

/** Seconds to wait before trying again: the server's hint, kept within a sensible range. */
export function retryAfterSeconds(err, fallback = 30) {
  const hinted = Number(err?.response?.data?.retryAfter ?? err?.response?.headers?.['retry-after']);
  const seconds = Number.isFinite(hinted) && hinted > 0 ? hinted : fallback;
  return Math.min(Math.max(Math.ceil(seconds), 5), 90);
}
