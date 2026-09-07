const REMEMBER_KEY = "splits-remember-me";
const SESSION_ALIVE_KEY = "splits-session-alive";

export function getRememberPreference() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(REMEMBER_KEY) !== "0";
}

export function setRememberPreference(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  if (remember) {
    sessionStorage.removeItem(SESSION_ALIVE_KEY);
  } else {
    sessionStorage.setItem(SESSION_ALIVE_KEY, "1");
  }
}

export function shouldClearSession() {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(REMEMBER_KEY) === "0" &&
    sessionStorage.getItem(SESSION_ALIVE_KEY) !== "1"
  );
}
