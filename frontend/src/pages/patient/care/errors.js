// Turns API errors into short, human messages. Never shows raw "Request failed (404)".
const RAW = /request failed|^\s*\d{3}\b|internal server error|not found|cannot (get|post|delete)/i;

export function friendlyError(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  const status = err.status ?? 0;
  const message = typeof err.message === 'string' ? err.message.trim() : '';

  // api.js already writes friendly copy for network failures and timeouts
  if (status === 0) return message && !RAW.test(message) ? message : fallback;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have access to this.';
  if (status === 404 || status >= 500) return fallback;
  // 400 / 409 etc.: the server usually explains the problem in plain words
  return message && !RAW.test(message) && message.length < 160 ? message : fallback;
}
