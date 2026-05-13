import { useEffect, useState } from "react";
import axios from "axios";
import DynamicForm from "./DynamicForm";

const API_BASE = "http://localhost:5000";

export default function DependencySection({
  dep,
  depSchema,
  depMode,
  depFormData,
  onModeChange,
  setDepFormData,
  parentFormData = {},
}) {
  const [collapsed, setCollapsed] = useState(false);

  const mode =
    depMode || dep.resolutionStrategy?.defaultMode || "inline-create";

  const allowModeSwitch = dep.resolutionStrategy?.allowModeSwitch !== false;

  const isOptional = dep.required === false;

  const currentValues = depFormData[dep.resourceType] || {};

  function handleFieldChange(key, value) {
    setDepFormData((prev) => ({
      ...prev,
      [dep.resourceType]: {
        ...(prev[dep.resourceType] || {}),
        [key]: value,
      },
    }));
  }

  const accentColor = mode === "existing" ? "#1A73E8" : "#8C4FFF";

  const accentBg =
    mode === "existing" ? "rgba(26,115,232,0.07)" : "rgba(140,79,255,0.08)";

  const accentBorder =
    mode === "existing" ? "rgba(26,115,232,0.25)" : "rgba(140,79,255,0.25)";

  return (
    <div
      style={{
        border: `2px solid ${accentColor}`,
        borderRadius: 12,
        marginBottom: 24,
        overflow: "hidden",
        background: "var(--surface)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: accentBg,
          borderBottom: `1px solid ${accentBorder}`,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            background: accentColor,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 20,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          {isOptional ? "Optional" : "Required"}
        </span>

        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            flex: 1,
            color: "var(--text)",
          }}
        >
          {depSchema.displayName}
        </span>

        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            fontFamily: "var(--mono)",
          }}
        >
          {depSchema.terraformType}
        </span>

        {allowModeSwitch && (
          <div
            style={{
              display: "flex",
              borderRadius: 8,
              border: `1px solid ${accentColor}`,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {["existing", "inline-create"].map((m) => (
              <button
                key={m}
                onClick={(e) => {
                  e.stopPropagation();
                  onModeChange(dep.resourceType, m);
                }}
                style={{
                  padding: "5px 13px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: mode === m ? accentColor : "transparent",
                  color: mode === m ? "#fff" : accentColor,
                  transition: "all 0.15s",
                }}
              >
                {m === "existing" ? "Use existing" : "Auto-create"}
              </button>
            ))}
          </div>
        )}

        <span
          onClick={() => setCollapsed((c) => !c)}
          style={{
            color: accentColor,
            fontWeight: 700,
            fontSize: 20,
            cursor: "pointer",
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {collapsed ? "+" : "−"}
        </span>
      </div>

      {/* Reason */}
      {!collapsed && dep.reason && (
        <div
          style={{
            background: accentBg,
            borderBottom: `1px solid ${accentBorder}`,
            padding: "8px 18px",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          {dep.reason}
        </div>
      )}

      {/* Body */}
      {!collapsed && (
        <div style={{ padding: 20 }}>
          {mode === "existing" ? (
            <ExistingModeInput
              dep={dep}
              currentValues={currentValues}
              onFieldChange={handleFieldChange}
              accentColor={accentColor}
              parentFormData={parentFormData}
            />
          ) : (
            <DynamicForm
              schema={depSchema}
              formData={currentValues}
              setFormData={(updater) => {
                const next =
                  typeof updater === "function"
                    ? updater(currentValues)
                    : updater;

                setDepFormData((prev) => ({
                  ...prev,
                  [dep.resourceType]: next,
                }));
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ExistingModeInput({
  dep,
  currentValues,
  onFieldChange,
  accentColor,
  parentFormData = {},
}) {
  const idFieldKey = dep.linkField;

  // Universal source support
  const source = dep.existingResourceDataSource || dep.existingDataSource;

  const label = dep.existingLabel || dep.displayName || dep.linkField;

  const [options, setOptions] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  // Cascading dependency support
  const dependencyValue = source?.dependsOn
    ? parentFormData[source.dependsOn]
    : null;

  useEffect(() => {
    async function loadOptions() {
      if (!source?.endpoint) return;

      try {
        setLoading(true);
        setError("");

        const params = {};

        if (source.queryParam && dependencyValue) {
          params[source.queryParam] = dependencyValue;
        }

        const res = await axios.get(`${API_BASE}${source.endpoint}`, {
          params,
        });

        setOptions(res.data.data || []);
      } catch (err) {
        console.error(err);

        setOptions([]);

        setError("Failed to load existing resources");
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, [source?.endpoint, source?.queryParam, dependencyValue]);

  return (
    <div>
      <div
        style={{
          background: "rgba(26,115,232,0.04)",
          border: "1px dashed rgba(26,115,232,0.35)",
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 16,
          fontSize: 13,
          color: "var(--text-muted)",
        }}
      >
        In <strong>Use existing</strong> mode the system references
        infrastructure already present in your cloud account.
      </div>

      <label
        style={{
          display: "block",
          fontWeight: 600,
          fontSize: 13,
          marginBottom: 8,
          color: "var(--text)",
        }}
      >
        {label}
        <span
          style={{
            color: "var(--error)",
            marginLeft: 4,
          }}
        >
          *
        </span>
      </label>

      <select
        value={currentValues[idFieldKey] || ""}
        onChange={(e) => onFieldChange(idFieldKey, e.target.value)}
        style={{
          width: "100%",
          background: "var(--surface)",
          border: `1.5px solid ${accentColor}`,
          borderRadius: 6,
          color: "var(--text)",
          fontSize: 14,
          padding: "10px 12px",
          outline: "none",
        }}
      >
        <option value="">
          {loading ? "Loading…" : `Select existing ${dep.displayName}`}
        </option>

        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <div
          style={{
            marginTop: 8,
            color: "var(--error)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
