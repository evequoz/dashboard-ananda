import { useAuth } from "../contexts/AuthContext";

/**
 * UserBadge — À placer dans la Sidebar ou le Header
 * Affiche l'utilisateur connecté, son rôle, et un bouton de déconnexion
 */
export default function UserBadge() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const roleLabel = user.role === "admin" ? "Administrateur" : "Assistante";
  const roleColor = user.role === "admin" ? "rgba(180,150,100,0.8)" : "rgba(100,160,200,0.8)";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 14px",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "4px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34,
        borderRadius: "50%",
        background: "rgba(180,150,100,0.15)",
        border: "1px solid rgba(180,150,100,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: 500,
        color: "rgba(180,150,100,0.9)",
        letterSpacing: "0.05em",
        flexShrink: 0,
      }}>
        {user.avatar}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "13px",
          fontWeight: 400,
          color: "rgba(255,255,255,0.75)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {user.name}
        </div>
        <div style={{
          fontSize: "10px",
          fontWeight: 300,
          color: roleColor,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>
          {roleLabel}
        </div>
      </div>

      {/* Bouton déconnexion */}
      <button
        onClick={logout}
        title="Se déconnecter"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          color: "rgba(255,255,255,0.2)",
          transition: "color 0.2s",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(220,100,80,0.7)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
      >
        {/* Icône logout SVG */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}
