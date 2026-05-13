import { getProvider } from "../config/providers.jsx";

/* Category icons (simple SVG inline) */
const CATEGORY_ICONS = {
  compute:    "⚙️",
  storage:    "🗄️",
  networking: "🌐",
  database:   "🛢️",
  security:   "🔒",
  serverless: "⚡",
  analytics:  "📊",
  default:    "📦",
};

export default function ResourceListPage({ providerKey, resources, onSelect }) {
  const provider = getProvider(providerKey);

  // Group resources by category
  const grouped = {};
  for (const r of resources) {
    const cat = (r.category || r.terraformType?.split("_")[1] || "general").toLowerCase();
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  }

  const categories = Object.keys(grouped).sort();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 28px 80px" }}>
      {/* Page header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 40,
        flexWrap: "wrap",
      }}>
        {/* Provider badge */}
        <div style={{
          width: 52, height: 52,
          borderRadius: "50%",
          background: provider.bgColor,
          border: `2px solid ${provider.borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 16,
          color: provider.color,
          flexShrink: 0,
        }}>
          {provider.shortLabel.slice(0, 2)}
        </div>

        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px" }}>
            {provider.label}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            {resources.length} resource{resources.length !== 1 ? "s" : ""} available — click one to configure
          </p>
        </div>
      </div>

      {/* Categorised grid */}
      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: 40 }}>
          {/* Category label */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[cat] || CATEGORY_ICONS.default}</span>
            <h2 style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
            }}>
              {cat}
            </h2>
            <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 4 }} />
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: 16,
          }}>
            {grouped[cat].map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                provider={provider}
                onClick={() => onSelect(resource.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResourceCard({ resource, provider, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: "1.5px solid var(--border)",
        borderRadius: 12,
        padding: "20px 20px 18px",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = `1.5px solid ${provider.color}`;
        e.currentTarget.style.background = provider.bgColor;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = "1.5px solid var(--border)";
        e.currentTarget.style.background = "var(--surface)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
        {resource.displayName}
      </div>
      <div style={{
        fontSize: 11,
        color: "var(--text-dim)",
        fontFamily: "var(--mono)",
        background: "var(--surface-3)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "3px 8px",
        width: "fit-content",
      }}>
        {resource.terraformType}
      </div>
      <div style={{
        marginTop: 4,
        fontSize: 12,
        color: provider.color,
        fontWeight: 600,
      }}>
        Configure →
      </div>
    </div>
  );
}
