import { DECISION_LIVE_API } from "./apiConfig";

const SESSION_KEY = "almehwar_dashboard_session_v1";

export interface DashboardSession {
  token: string;
  username: string;
  expiresAt: string;
}

interface AuthResponse {
  success: boolean;
  result?: DashboardSession | { verified: boolean; username: string; expiresAt: string };
  error?: string;
}

async function postAuth(action: string, payload: unknown = {}, token?: string) {
  const response = await fetch(DECISION_LIVE_API, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload, token }),
  });
  if (!response.ok) throw new Error(`Login service returned ${response.status}`);
  const json = await response.json() as AuthResponse;
  if (!json.success) throw new Error(json.error || "Login failed.");
  return json.result;
}

export function readDashboardSession(): DashboardSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as DashboardSession;
    if (!session.token || !session.username || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveDashboardSession(session: DashboardSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearDashboardSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function getDashboardToken() {
  return readDashboardSession()?.token ?? null;
}

export async function loginToDashboard(username: string, password: string) {
  const result = await postAuth("login", { username, password }) as DashboardSession | undefined;
  if (!result?.token) throw new Error("Login service did not return a session.");
  saveDashboardSession(result);
  return result;
}

export async function verifyDashboardSession(session: DashboardSession) {
  const result = await postAuth("verifySession", {}, session.token) as { verified: boolean } | undefined;
  return result?.verified === true;
}
