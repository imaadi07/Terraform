export default function ResourceSelector({
  resources,
  selectedResource,
  onSelect,
}) {
  return (
    <div
      style={{
        marginBottom: "24px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))",
        gap: "16px",
      }}
    >
      {resources.map((resource) => {
        const active =
          selectedResource === resource.id;

        return (
          <div
            key={resource.id}
            onClick={() => onSelect(resource.id)}
            style={{
              border: active
                ? "2px solid #FF9900"
                : "1px solid var(--border)",
              borderRadius: "10px",
              padding: "18px",
              cursor: "pointer",
              background: active
                ? "rgba(255,153,0,0.08)"
                : "var(--surface)",
              transition: "all 0.15s",
            }}
          >
            <div
              style={{
                fontWeight: "700",
                marginBottom: "6px",
              }}
            >
              {resource.displayName}
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "var(--text-dim)",
                fontFamily: "var(--mono)",
              }}
            >
              {resource.terraformType}
            </div>
          </div>
        );
      })}
    </div>
  );
}