import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { supabase, getValidSession } from "../lib/supabaseClient";

// ============================================================
// CONFIGURATION DES UTILISATEURS ET PERMISSIONS
// ============================================================

export type Role = "admin" | "assistant";

export type PageKey = "overview" | "agenda" | "poste" | "members" | "finance" | "tasks" | "contacts";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar: string; // initiales
}

// Permissions par rôle
const ROLE_PERMISSIONS: Record<Role, PageKey[]> = {
  admin: ["overview", "agenda", "poste", "members", "finance", "tasks", "contacts"],
  assistant: ["overview", "agenda", "poste", "tasks", "contacts"],
};

type UserProfile = { name: string; role: Role; avatar: string };

// Profil applicatif (sans mot de passe): l'authentification est gérée par Supabase.
const USER_PROFILES: Record<string, UserProfile> = {
  "serge@eh-me.com": { name: "Serge Evequoz", role: "admin", avatar: "SE" },
  "admin@eh-me.com": { name: "Assistante", role: "assistant", avatar: "AS" },
};

// ============================================================
// TYPES ET CONTEXTE
// ============================================================

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  canAccess: (page: PageKey) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateUser = useMemo(() => buildUserFromAuth(), []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { session, error } = await getValidSession();
      if (!mounted) return;
      if (error) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const sessionUser = session?.user ?? null;
      setUser(sessionUser ? hydrateUser(sessionUser.id, sessionUser.email) : null);
      setIsLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser ? hydrateUser(sessionUser.id, sessionUser.email) : null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [hydrateUser]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user) {
      return { success: false, error: error?.message || "Email ou mot de passe incorrect" };
    }

    const sessionUser = data.session?.user ?? null;
    if (!sessionUser) {
      const { session, error: sessionError } = await getValidSession();
      if (sessionError || !session?.user) {
        return {
          success: false,
          error:
            sessionError?.message ||
            "Connexion établie mais session invalide. Veuillez réessayer.",
        };
      }
      setUser(hydrateUser(session.user.id, session.user.email));
      return { success: true };
    }

    setUser(hydrateUser(sessionUser.id, sessionUser.email));
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const canAccess = (page: PageKey): boolean => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role].includes(page);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, canAccess, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

function buildUserFromAuth() {
  return (id: string, email?: string | null, authUser?: SupabaseAuthUser): User => {
    const normalizedEmail = (email || "").toLowerCase();

    const meta = authUser?.user_metadata as Record<string, unknown> | undefined;
    const metaRole = meta?.dashboard_role;
    if (metaRole === "admin" || metaRole === "assistant") {
      const metaName =
        (typeof meta?.full_name === "string" && meta.full_name) ||
        (typeof meta?.name === "string" && meta.name) ||
        normalizedEmail.split("@")[0] ||
        "Utilisateur";
      const avatar = (metaName || "U")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase();
      return {
        id,
        email: normalizedEmail,
        name: metaName,
        role: metaRole,
        avatar: avatar || "U",
      };
    }

    const known = USER_PROFILES[normalizedEmail];

    if (known) {
      return {
        id,
        email: normalizedEmail,
        name: known.name,
        role: known.role,
        avatar: known.avatar,
      };
    }

    const localPart = normalizedEmail.split("@")[0] || "Utilisateur";
    const displayName = localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    const avatar = (displayName || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();

    return {
      id,
      email: normalizedEmail,
      name: displayName || "Utilisateur",
      role: "assistant",
      avatar: avatar || "U",
    };
  };
}

// ============================================================
// HOOK
// ============================================================

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
