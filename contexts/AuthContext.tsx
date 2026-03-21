import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ============================================================
// CONFIGURATION DES UTILISATEURS ET PERMISSIONS
// ============================================================

export type Role = "admin" | "assistant";

export type PageKey = "overview" | "calendar" | "finance" | "emails" | "posts" | "tasks" | "tools";

export interface User {
  email: string;
  name: string;
  role: Role;
  avatar: string; // initiales
}

// Permissions par rôle
const ROLE_PERMISSIONS: Record<Role, PageKey[]> = {
  admin: ["overview", "calendar", "finance", "emails", "posts", "tasks", "tools"],
  assistant: ["overview", "calendar", "posts", "tasks", "tools"],
};

// Comptes utilisateurs (à personnaliser)
const USERS: Array<User & { password: string }> = [
  {
    email: "serge@eh-me.com",
    password: "Ananda2024!", // ← CHANGER
    name: "Serge Evequoz",
    role: "admin",
    avatar: "SE",
  },
  {
    email: "assistante@ananda-communaute.cloud",
    password: "Assistant2024!", // ← CHANGER
    name: "Assistante",
    role: "assistant",
    avatar: "AS",
  },
];

// ============================================================
// TYPES ET CONTEXTE
// ============================================================

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
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

  // Restaurer la session depuis sessionStorage (expire à la fermeture)
  useEffect(() => {
    const stored = sessionStorage.getItem("ananda_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem("ananda_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulation d'un délai réseau (anti brute-force visuel)
    await new Promise((r) => setTimeout(r, 600));

    const found = USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!found) {
      return { success: false, error: "Email ou mot de passe incorrect" };
    }

    const { password: _, ...userData } = found;
    setUser(userData);
    sessionStorage.setItem("ananda_user", JSON.stringify(userData));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("ananda_user");
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

// ============================================================
// HOOK
// ============================================================

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
