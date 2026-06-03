import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Profile, Role } from "./database.types";

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// Dev-bypass: zet VITE_DEV_BYPASS=member of VITE_DEV_BYPASS=coach in .env.local
// om zonder Supabase rond te klikken. NOOIT in productie aan.
const BYPASS_ENV = import.meta.env.VITE_DEV_BYPASS as Role | undefined;
function getBypass(): Role | undefined {
  if (typeof window === "undefined") return BYPASS_ENV;
  const ls = window.localStorage.getItem("dev-bypass-role");
  if (ls === "member" || ls === "coach") return ls;
  return BYPASS_ENV;
}
export const BYPASS = getBypass();

function makeFakeAuthState(role: Role, signOut: () => Promise<void>): AuthState {
  const fakeUserId = role === "coach" ? "dev-coach-id" : "dev-member-id";
  return {
    session: {
      access_token: "dev",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "dev",
      user: {
        id: fakeUserId,
        aud: "authenticated",
        email: role === "coach" ? "coach@dev.local" : "member@dev.local",
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
      } as Session["user"],
    },
    profile: {
      id: fakeUserId,
      role,
      full_name: role === "coach" ? "Dev Coach (Yari)" : "Dev Lid",
      phone: null,
      checkin_cadence: "weekly",
      program_start_date: role === "member" ? "2026-04-22" : null,
      program_end_date: role === "member" ? "2026-07-15" : null,
      sportbit_member_id: null,
      created_at: new Date().toISOString(),
    },
    loading: false,
    signOut,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  if (BYPASS === "member" || BYPASS === "coach") {
    const fake = makeFakeAuthState(BYPASS, async () => {
      // eslint-disable-next-line no-alert
      alert("Dev-bypass actief — zet VITE_DEV_BYPASS uit in .env.local om echt uit te loggen.");
    });
    return <AuthContext.Provider value={fake}>{children}</AuthContext.Provider>;
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile((data as Profile | null) ?? null);
        setLoading(false);
      });
  }, [session]);

  const value: AuthState = {
    session,
    profile,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth buiten AuthProvider");
  return ctx;
}
