// Turns an API error into copy a person can act on. Server messages written for
// people pass through; generic "Request failed (404)" style messages and network
// failures are replaced with the given fallback.
export default function friendlyError(err, fallback = 'Something went wrong. Please try again.') {
  const msg = typeof err?.message === 'string' ? err.message.trim() : '';
  if (!msg) return fallback;
  if (/^request failed/i.test(msg)) {
    if (err.status >= 500) return 'Our server had a problem. Please try again in a moment.';
    return fallback;
  }
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return 'We could not reach MediGuide. Check your connection and try again.';
  }
  return msg;
}
