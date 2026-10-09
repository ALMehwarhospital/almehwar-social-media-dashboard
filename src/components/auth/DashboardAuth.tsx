import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, Waves } from "lucide-react";
import {
  clearDashboardSession,
  loginToDashboard,
  readDashboardSession,
  verifyDashboardSession,
  type DashboardSession,
} from "../../data/dashboardAuth";

type AuthContextValue = {
  session: DashboardSession;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useDashboardAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useDashboardAuth must be used inside DashboardSessionGate");
  return value;
}

function LoginScreen({ onLogin }: { onLogin: (session: DashboardSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) return;
    setSubmitting(true);
    setError("");
    try {
      onLogin(await loginToDashboard(username.trim(), password));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-warm-100 flex items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-mint-300/20 blur-3xl" />
      <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-signal-blue/10 blur-3xl" />
      <div className="relative w-full max-w-md rounded-3xl border border-navy-900/8 bg-white p-7 sm:p-9 shadow-xl shadow-navy-900/8">
        <div className="flex items-center gap-2 text-mint-600">
          <Waves size={20} strokeWidth={2.5} />
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase">Secure access</span>
        </div>
        <h1 className="font-display text-3xl text-navy-900 mt-5">AlMehwar Hospital</h1>
        <p className="text-sm text-fog-500 mt-2">Sign in to open the Social Intelligence dashboard.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-navy-700">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="mt-2 w-full rounded-xl border border-navy-900/12 bg-warm-50 px-4 py-3 text-sm text-navy-900 outline-none transition focus:border-signal-blue focus:ring-4 focus:ring-signal-blue/10"
              placeholder="Enter username"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-navy-700">Password</span>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-navy-900/12 bg-warm-50 px-4 py-3 pr-12 text-sm text-navy-900 outline-none transition focus:border-signal-blue focus:ring-4 focus:ring-signal-blue/10"
                placeholder="Enter password"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 px-4 text-fog-400 hover:text-navy-800" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}

          <button type="submit" disabled={submitting || !username.trim() || !password} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3.5 text-sm font-semibold text-warm-50 transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <LogIn size={17} />}
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-2 text-[11px] text-fog-400">
          <LockKeyhole size={13} />
          <span>Session stays active for 7 days on this device.</span>
        </div>
      </div>
    </main>
  );
}

export function DashboardSessionGate({ children }: { children: ReactNode }) {
  const [initialSession] = useState<DashboardSession | null>(() => readDashboardSession());
  const [session, setSession] = useState<DashboardSession | null>(initialSession);
  const [checking, setChecking] = useState(Boolean(initialSession));

  useEffect(() => {
    if (!initialSession) return;
    let active = true;
    verifyDashboardSession(initialSession)
      .then((verified) => {
        if (!active) return;
        if (!verified) {
          clearDashboardSession();
          setSession(null);
        }
      })
      .catch(() => {
        if (!active) return;
        clearDashboardSession();
        setSession(null);
      })
      .finally(() => active && setChecking(false));
    return () => { active = false; };
  }, [initialSession]);

  const value = useMemo<AuthContextValue | null>(() => session ? {
    session,
    logout: () => {
      clearDashboardSession();
      setSession(null);
    },
  } : null, [session]);

  if (checking) {
    return <div className="min-h-screen bg-warm-100 flex items-center justify-center"><div className="text-center"><LoaderCircle size={26} className="animate-spin text-mint-600 mx-auto"/><p className="text-xs text-fog-500 mt-3">Checking secure session…</p></div></div>;
  }
  if (!session || !value) return <LoginScreen onLogin={setSession} />;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
