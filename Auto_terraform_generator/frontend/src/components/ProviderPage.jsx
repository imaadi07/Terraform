import { getProvider } from "../config/providers.jsx";

export default function ProviderPage({ providers, onSelect }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 28px 80px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 900,
            color: "var(--text)",
            letterSpacing: "-1px",
            marginBottom: 12,
            lineHeight: 1.15,
          }}
        >
          Terraform Infrastructure Generator
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--text-muted)",
            maxWidth: 500,
            margin: "0 auto",
          }}
        >
          Select a cloud provider to browse resources and generate
          production-ready Terraform configurations.
        </p>
      </div>

      {/* Provider cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 24,
        }}
      >
        {providers.map((key) => {
          const p = getProvider(key);
          return (
            <ProviderCard
              key={key}
              provider={p}
              onClick={() => onSelect(key)}
            />
          );
        })}
      </div>

      {/* Footer hint */}
      {/* <p style={{
        textAlign: "center",
        marginTop: 56,
        fontSize: 13,
        color: "var(--text-dim)",
      }}>
        New providers appear automatically when schemas are added to the backend.
      </p> */}
    </div>
  );
}

function ProviderCard({ provider, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: `2px solid var(--border)`,
        borderRadius: 16,
        padding: "36px 28px",
        cursor: "pointer",
        transition: "all 0.18s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        userSelect: "none",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = `2px solid ${provider.color}`;
        e.currentTarget.style.background = provider.bgColor;
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = `2px solid var(--border)`;
        e.currentTarget.style.background = "var(--surface)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      {/* Color orb */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: provider.bgColor,
          border: `2px solid ${provider.borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 900,
          color: provider.color,
          letterSpacing: "-1px",
          flexShrink: 0,
        }}
      >
        {provider.shortLabel.slice(0, 2)}
      </div>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 18,
            color: "var(--text)",
            marginBottom: 4,
          }}
        >
          {provider.shortLabel}
        </div>
        <div
          style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}
        >
          {provider.label}
        </div>
      </div>

      <div
        style={{
          marginTop: 4,
          padding: "6px 18px",
          borderRadius: 20,
          background: provider.bgColor,
          border: `1px solid ${provider.borderColor}`,
          fontSize: 12,
          fontWeight: 700,
          color: provider.color,
          letterSpacing: "0.04em",
        }}
      >
        Browse Resources →
      </div>
    </div>
  );
}
