export function friendlyError(error: unknown, fallback: string) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message: string }).message)
      : typeof error === "string"
        ? error
        : "";

  const lower = message.toLowerCase();

  if (lower.includes("invalid login") || lower.includes("invalid_credentials")) {
    return "Email or password is incorrect.";
  }
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "An account with that email already exists. Try signing in.";
  }
  if (lower.includes("invite code is not valid")) {
    return "That invite code is not valid.";
  }
  if (lower.includes("sign in before joining")) {
    return "Sign in first, then use the invite link again.";
  }
  if (
    lower.includes("row-level security") ||
    lower.includes("rls") ||
    lower.includes("permission denied")
  ) {
    return "You don't have permission to do that.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network issue. Check your connection and try again.";
  }
  if (lower.includes("jwt") || lower.includes("auth")) {
    return "Your session expired. Please sign in again.";
  }

  if (message && message.length < 140 && !lower.includes("violates")) {
    return message;
  }

  return fallback;
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };
