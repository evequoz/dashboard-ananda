import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { supabase, getValidSession } from "../lib/supabaseClient";

// ============================================================
// Authentification : UNIQUEMENT Supabase Auth (JWT)
// ============================================================
// - Aucun mot de passe ni vérification locale : tout passe par
//   supabase.auth.signInWithPassword → session JWT → PostgREST envoie Bearer token.
// - Les entrées ci-dessous ne sont PAS des comptes : seulement des valeurs d’affichage
//   / rôle UI par défaut quand user_metadata Supabase ne définit pas dashboard_role.
// - Pour un rôle admin/assistant piloté sans redéploiement : Dashboard Supabase →
//   Authentication → utilisateur → User Metadata : { "dashboard_role": "admin" | "assistant" }
// ============================================================

export type Role = "admin" | "assistant";

export type PageKey = "overview" | "agenda" | "poste" | "members" | "finance" | "tasks" | "contacts";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar: string;
}

const ROLE_PERMISSIONS: Record<Role, PageKey[]> = {
  admin: ["overview", "agenda", "poste", "members", "finance", "tasks", "contacts"],
  assistant: ["overview", "agenda", "poste", "tasks", "contacts"],
};

/** Affichage / rôle par défaut si user_metadata.dashboard_role absent (pas d’auth local). */
const FALLBACK_DISPLAY_BY_EMAIL: Record<string, { name: string; role: Role; avatar: string }> = {
  "serge@eh-me.com": { name: "Serge Evequoz", role: "admin", avatar: "SE" },
  "admin@eh-me.com": { name: "Assistante", role: "assistant", avatar: "AS" },
};

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  canAccess: (page: PageKey) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mapSessionToUser = useMemo(() => buildMapSessionToUser(), []);

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
      setUser(sessionUser ? mapSessionToUser(sessionUser) : null);
      setIsLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const sessionUser = session.user;
      setUser(sessionUser ? mapSessionToUser(sessionUser) : null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [mapSessionToUser]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      return { success: false, error: error?.message || "Email ou mot de passe incorrect" };
    }

    if (!data.session?.access_token) {
      return {
        success: false,
        error: "Réponse de connexion sans jeton d’accès. Vérifiez la configuration Supabase.",
      };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return { success: false, error: sessionError.message };
    }
    const s = sessionData.session;
    if (!s?.access_token) {
      return {
        success: false,
        error:
          "supabase.auth.getSession() n’a pas retourné de session après connexion (JWT manquant).",
      };
    }

    setUser(mapSessionToUser(s.user));
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

function buildMapSessionToUser() {
  return (sessionUser: SupabaseAuthUser): User => {
    const normalizedEmail = (sessionUser.email || "").toLowerCase();
    const meta = sessionUser.user_metadata as Record<string, unknown> | undefined;
    const metaRole = meta?.dashboard_role;

    if (metaRole === "admin" || metaRole === "assistant") {
      const name =
        (typeof meta?.full_name === "string" && meta.full_name) ||
        (typeof meta?.name === "string" && meta.name) ||
        normalizedEmail.split("@")[0] ||
        "Utilisateur";
      const rawAvatar = meta?.avatar_initials;
      const avatar =
        typeof rawAvatar === "string" && rawAvatar.trim()
          ? rawAvatar.trim().slice(0, 3).toUpperCase()
          : initialsFromName(name);
      return {
        id: sessionUser.id,
        email: normalizedEmail,
        name,
        role: metaRole,
        avatar,
      };
    }

    const known = FALLBACK_DISPLAY_BY_EMAIL[normalizedEmail];
    if (known) {
      return {
        id: sessionUser.id,
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

    return {
      id: sessionUser.id,
      email: normalizedEmail,
      name: displayName || "Utilisateur",
      role: "assistant",
      avatar: initialsFromName(displayName || "U"),
    };
  };
}

function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "U";
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
