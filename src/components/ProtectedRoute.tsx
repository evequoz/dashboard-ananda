import { Navigate } from "react-router-dom";
import { useAuth, PageKey } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  page: PageKey;
  children: React.ReactNode;
}

/**
 * ProtectedRoute — Vérifie :
 * 1. L'utilisateur est connecté
 * 2. L'utilisateur a accès à cette page selon son rôle
 */
export default function ProtectedRoute({ page, children }: ProtectedRouteProps) {
  const { user, canAccess, isLoading } = useAuth();

  // Attendre la vérification de session
  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0e0c0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          width: 24, height: 24,
          border: "1px solid rgba(180,150,100,0.3)",
          borderTopColor: "rgba(180,150,100,0.9)",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Non connecté → page de login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Connecté mais pas accès à cette page → redirection vers accueil
  if (!canAccess(page)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
