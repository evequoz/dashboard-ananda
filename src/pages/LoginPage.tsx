import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

// ============================================================
// PAGE DE LOGIN — Ananda Communauté
// Esthétique : raffinée, spirituelle, sobre et mémorable
// ============================================================

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    setError("");
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (!result.success) {
      setError(result.error || "Erreur de connexion");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          background: #0e0c0a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
          position: relative;
        }

        /* Fond ambiance — cercles lumineux subtils */
        .login-root::before {
          content: '';
          position: absolute;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(180,150,100,0.07) 0%, transparent 70%);
          top: -100px; left: -150px;
          pointer-events: none;
        }
        .login-root::after {
          content: '';
          position: absolute;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(100,130,160,0.06) 0%, transparent 70%);
          bottom: -80px; right: -100px;
          pointer-events: none;
        }

        /* Motif de fond géométrique très subtil */
        .bg-pattern {
          position: absolute;
          inset: 0;
          background-image:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 59px,
              rgba(255,255,255,0.015) 59px,
              rgba(255,255,255,0.015) 60px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 59px,
              rgba(255,255,255,0.015) 59px,
              rgba(255,255,255,0.015) 60px
            );
          pointer-events: none;
        }

        .login-card {
          position: relative;
          z-index: 10;
          width: 420px;
          padding: 56px 48px 48px;
          background: rgba(255,255,255,0.034);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          backdrop-filter: blur(20px);
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .login-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Ligne dorée décorative en haut */
        .login-card::before {
          content: '';
          position: absolute;
          top: 0; left: 48px; right: 48px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(180,150,100,0.6), transparent);
        }

        /* Symbole OM ou lotus centré */
        .login-symbol {
          text-align: center;
          margin-bottom: 32px;
        }
        .login-symbol .symbol {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          color: rgba(180,150,100,0.7);
          letter-spacing: 0.1em;
          display: block;
          line-height: 1;
        }
        .login-symbol .org {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 0.35em;
          color: rgba(255,255,255,0.25);
          text-transform: uppercase;
          margin-top: 10px;
          display: block;
        }

        .login-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 300;
          color: rgba(255,255,255,0.88);
          text-align: center;
          margin-bottom: 6px;
          letter-spacing: 0.02em;
        }
        .login-subtitle {
          font-size: 12px;
          font-weight: 300;
          color: rgba(255,255,255,0.28);
          text-align: center;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 40px;
        }

        .field {
          margin-bottom: 18px;
        }
        .field label {
          display: block;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 8px;
        }
        .field input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 2px;
          padding: 13px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 300;
          color: rgba(255,255,255,0.85);
          outline: none;
          transition: border-color 0.3s, background 0.3s;
        }
        .field input::placeholder {
          color: rgba(255,255,255,0.18);
        }
        .field input:focus {
          border-color: rgba(180,150,100,0.45);
          background: rgba(180,150,100,0.04);
        }

        .error-msg {
          font-size: 12px;
          color: rgba(220,100,80,0.85);
          text-align: center;
          margin-bottom: 16px;
          min-height: 18px;
          letter-spacing: 0.02em;
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          background: rgba(180,150,100,0.15);
          border: 1px solid rgba(180,150,100,0.35);
          border-radius: 2px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: rgba(180,150,100,0.9);
          cursor: pointer;
          transition: background 0.3s, border-color 0.3s, color 0.3s;
          position: relative;
          overflow: hidden;
        }
        .login-btn:hover:not(:disabled) {
          background: rgba(180,150,100,0.22);
          border-color: rgba(180,150,100,0.55);
          color: rgba(180,150,100,1);
        }
        .login-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Spinner dans le bouton */
        .btn-spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border: 1px solid rgba(180,150,100,0.3);
          border-top-color: rgba(180,150,100,0.9);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer {
          margin-top: 32px;
          text-align: center;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.12);
        }
      `}</style>

      <div className="login-root">
        <div className="bg-pattern" />
        <div className={`login-card ${visible ? "visible" : ""}`}>
          <div className="login-symbol">
            <span className="symbol">ॐ</span>
            <span className="org">Ananda Communauté</span>
          </div>

          <h1 className="login-title">Accès au tableau de bord</h1>
          <p className="login-subtitle">Espace privé</p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Adresse email</label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="error-msg">{error}</div>

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="btn-spinner" />
                  Connexion…
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          <div className="login-footer">
            Session active jusqu'à fermeture du navigateur
          </div>
        </div>
      </div>
    </>
  );
}
