import { useTheme } from "../context/ThemeContext";

/* ── Sun icon ── */
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

/* ── Moon icon ── */
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export default function Navbar({ view, onHome }) {
  const { theme, toggle } = useTheme();

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      height: "var(--nav-h)",
      background: "var(--bg-nav)",
      borderBottom: "1px solid var(--border)",
      boxShadow: "var(--shadow-sm)",
      display: "flex",
      alignItems: "center",
      padding: "0 28px",
      gap: "16px",
    }}>
      {/* Logo / Home */}
      <div
        onClick={onHome}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        {/* Terraform-ish "T" mark */}
        <div style={{
          width: 34, height: 34,
          background: "linear-gradient(135deg, #7b42f6 0%, #4285F4 100%)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 900,
          fontSize: 18,
          letterSpacing: "-1px",
          flexShrink: 0,
        }}>T</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.1, color: "var(--text)" }}>
            TerraGen
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1 }}>
            Infrastructure as Code
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      {view !== "home" && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: 13,
          color: "var(--text-muted)",
          marginLeft: 8,
        }}>
          <span
            onClick={onHome}
            style={{ cursor: "pointer", color: "var(--accent)" }}
          >
            Providers
          </span>
          {view.provider && (
            <>
              <span style={{ color: "var(--text-dim)" }}>›</span>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>
                {view.provider.toUpperCase()}
              </span>
            </>
          )}
          {view.resource && (
            <>
              <span style={{ color: "var(--text-dim)" }}>›</span>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>
                {view.resource}
              </span>
            </>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <button
        onClick={toggle}
        title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 38,
          height: 38,
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--surface-2)",
          color: "var(--text-muted)",
          cursor: "pointer",
          transition: "all var(--transition)",
          flexShrink: 0,
        }}
      >
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
      </button>
    </nav>
  );
}
