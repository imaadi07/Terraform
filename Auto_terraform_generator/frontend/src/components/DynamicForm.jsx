import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000";

const inputStyle = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: 14,
  padding: "10px 12px",
  outline: "none",
  transition: "border-color 0.15s",
  fontFamily: "var(--sans)",
};

function getDataSource(field) {
  return field.dataSource || field.dynamicSource;
}

function matchesCondition(condition, formData) {
  if (!condition?.field) return true;
  return formData?.[condition.field] === condition.equals;
}

function shouldShowField(field, formData) {
  if (field.visibleWhen && !matchesCondition(field.visibleWhen, formData)) {
    return false;
  }

  return true;
}

function inferType(field) {
  if (getDataSource(field)) return "dynamic";
  if (field.validation?.enum || field.enumValues) return "enum";
  if (field.validation?.list) return "list";
  if (field.validation?.map || field.type === "object") return "map";
  if (field.validation?.multiline) return "multiline";
  if (field.type) return field.type;
  if (typeof field.default === "boolean") return "boolean";
  if (typeof field.default === "number") return "number";
  return "string";
}

function Toggle({ value, onChange }) {
  const on = !!value;
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div style={{
        width: 42, height: 24,
        borderRadius: 12,
        background: on ? "var(--accent)" : "var(--border)",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}>
        <div style={{
          position: "absolute",
          top: 3, left: on ? 21 : 3,
          width: 18, height: 18,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        }} />
      </div>
      <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
        {on ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}

function DynamicSelect({ field, value, onChange, formData }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const source = getDataSource(field);
  const dependencyValue = source?.dependsOn ? formData[source.dependsOn] : null;
  const multiple = source?.multiple === true;

  useEffect(() => {
    async function fetchOptions() {
      if (!source?.endpoint) return;
      try {
        setLoading(true);
        setError("");
        const params = {};
        if (source.queryParam && dependencyValue) {
          params[source.queryParam] = dependencyValue;
        }
        const res = await axios.get(`${API_BASE}${source.endpoint}`, { params });
        setOptions(res.data.data || []);
      } catch (err) {
        console.error(err);
        setOptions([]);
        setError("Unable to load options");
      } finally {
        setLoading(false);
      }
    }
    fetchOptions();
  }, [source?.endpoint, dependencyValue]);

  if (multiple) {
    return (
      <>
        <select
          multiple
          value={Array.isArray(value) ? value : []}
          onChange={(e) =>
            onChange(Array.from(e.target.selectedOptions, (o) => o.value))
          }
          style={{ ...inputStyle, minHeight: 120 }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {loading && <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-dim)" }}>Loading…</div>}
        {error && <div style={{ marginTop: 6, fontSize: 12, color: "var(--error)" }}>{error}</div>}
      </>
    );
  }

  return (
    <>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      >
        <option value="">{loading ? "Loading…" : "Select option"}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <div style={{ marginTop: 6, fontSize: 12, color: "var(--error)" }}>{error}</div>}
    </>
  );
}

function FieldInput({ field, value, onChange, formData }) {
  const type = inferType(field);

  if (type === "dynamic")   return <DynamicSelect field={field} value={value} onChange={onChange} formData={formData} />;
  if (type === "boolean")   return <Toggle value={value} onChange={onChange} />;

  if (type === "enum") {
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {(field.validation?.enum || field.enumValues || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (type === "number") {
    return (
      <input
        type="number"
        value={value ?? ""}
        min={field.validation?.min}
        max={field.validation?.max}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    );
  }

  if (type === "list") {
    return (
      <input
        type="text"
        value={Array.isArray(value) ? value.join(", ") : ""}
        onChange={(e) =>
          onChange(e.target.value.split(",").map((v) => v.trim()).filter(Boolean))
        }
        placeholder="comma-separated values"
        style={inputStyle}
      />
    );
  }

  if (type === "map") {
    const mapValue =
      typeof value === "object"
        ? Object.entries(value).map(([k, v]) => `${k}=${v}`).join("\n")
        : "";
    return (
      <textarea
        rows={4}
        value={mapValue}
        onChange={(e) => {
          const parsed = {};
          e.target.value.split("\n").forEach((line) => {
            const [key, ...rest] = line.split("=");
            if (!key) return;
            parsed[key.trim()] = rest.join("=").trim();
          });
          onChange(parsed);
        }}
        style={{ ...inputStyle, resize: "vertical" }}
      />
    );
  }

  if (type === "multiline") {
    return (
      <textarea
        rows={5}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, resize: "vertical" }}
      />
    );
  }

  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

function SectionCard({ section, fields, formData, setFormData }) {
  const [expanded, setExpanded] = useState(section.defaultExpanded ?? true);

  function handleChange(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: 10,
      marginBottom: 20,
      overflow: "hidden",
      background: "var(--surface)",
    }}>
      <div
        onClick={() => section.collapsible && setExpanded((p) => !p)}
        style={{
          padding: "14px 20px",
          background: "var(--surface-2)",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
          cursor: section.collapsible ? "pointer" : "default",
          fontWeight: 700,
          fontSize: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "var(--text)",
          userSelect: "none",
        }}
      >
        {section.label}
        {section.collapsible && (
          <span style={{ color: "var(--text-dim)", fontSize: 18, lineHeight: 1 }}>
            {expanded ? "−" : "+"}
          </span>
        )}
      </div>

      {expanded && (
        <div style={{
          padding: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}>
          {fields.filter((field) => shouldShowField(field, formData)).map((field) => (
            <div key={field.key}>
              <div style={{
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 13,
                color: "var(--text)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}>
                {field.label}
                {field.required && (
                  <span style={{ color: "var(--error)", fontSize: 12 }}>*</span>
                )}
              </div>
              <FieldInput
                field={field}
                value={formData[field.key]}
                formData={formData}
                onChange={(value) => handleChange(field.key, value)}
              />
              {field.helpText && (
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-dim)" }}>
                  {field.helpText}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DynamicForm({ schema, formData, setFormData }) {
  const sections = [...schema.sections].sort((a, b) => a.order - b.order);
  const fieldsBySection = {};
  for (const section of sections) {
    fieldsBySection[section.key] = schema.fields
      .filter((f) => f.section === section.key)
      .sort((a, b) => a.order - b.order);
  }

  return (
    <div>
      {sections.map((section) => (
        <SectionCard
          key={section.key}
          section={section}
          fields={fieldsBySection[section.key]}
          formData={formData}
          setFormData={setFormData}
        />
      ))}
    </div>
  );
}
