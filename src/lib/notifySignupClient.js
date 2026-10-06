/**
 * notifySignupClient — fire-and-forget signup notification.
 * The bot token never lives in the client; the platform bot lives server-side.
 * Uses the public signup webhook endpoint (rate-limited server-side).
 */
export async function notifyNewSignup({ userId, displayName, email }) {
  try {
    const { invokeSecureFunction } = await import("./secureFunctions");
    await invokeSecureFunction("notify-signup", { userId, displayName, email });
  } catch {
    // non-critical
  }
}
