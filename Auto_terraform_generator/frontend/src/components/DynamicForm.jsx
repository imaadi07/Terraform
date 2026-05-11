import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000";

function inferType(field) {
  if (field.dynamicSource) return "dynamic";
  if (field.validation?.enum) return "enum";
  if (field.validation?.list) return "list";
  if (field.validation?.map) return "map";
  if (field.validation?.multiline) return "multiline";
  if (typeof field.default === "boolean") return "boolean";
  if (typeof field.default === "number") return "number";
  return "string";
}

const inputBase = {
  width: "100%",
  background: "#fff",
  border: "1px solid #d0d7de",
  borderRadius: "6px",
  color: "#24292f",
  fontSize: "14px",
  padding: "10px 12px",
  outline: "none",
};

function Toggle({ value, onChange }) {
  return (
    <input
      type="checkbox"
      checked={!!value}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

function DynamicSelect({ field, value, onChange }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchOptions() {
      try {
        setLoading(true);

        const res = await axios.get(
          `${API_BASE}${field.dynamicSource.endpoint}`
        );

        setOptions(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchOptions();
  }, [field]);

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      style={inputBase}
    >
      <option value="">
        {loading ? "Loading..." : "Select option"}
      </option>

      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function FieldInput({ field, value, onChange }) {
  const type = inferType(field);

  if (type === "dynamic") {
    return (
      <DynamicSelect
        field={field}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (type === "boolean") {
    return (
      <Toggle
        value={value}
        onChange={onChange}
      />
    );
  }

  if (type === "enum") {
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={inputBase}
      >
        {field.validation.enum.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
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
        style={inputBase}
      />
    );
  }

  if (type === "list") {
    return (
      <input
        type="text"
        value={Array.isArray(value) ? value.join(", ") : ""}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
          )
        }
        placeholder="comma separated values"
        style={inputBase}
      />
    );
  }

  if (type === "map") {
    const mapValue =
      typeof value === "object"
        ? Object.entries(value)
            .map(([k, v]) => `${k}=${v}`)
            .join("\n")
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
        style={inputBase}
      />
    );
  }

  if (type === "multiline") {
    return (
      <textarea
        rows={5}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={inputBase}
      />
    );
  }

  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      style={inputBase}
    />
  );
}

function SectionCard({
  section,
  fields,
  formData,
  setFormData,
}) {
  const [expanded, setExpanded] = useState(
    section.defaultExpanded ?? true
  );

  function handleChange(key, value) {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  return (
    <div
      style={{
        border: "1px solid #d0d7de",
        borderRadius: "10px",
        marginBottom: "20px",
        overflow: "hidden",
      }}
    >
      <div
        onClick={() =>
          section.collapsible &&
          setExpanded((p) => !p)
        }
        style={{
          padding: "16px",
          background: "#f6f8fa",
          cursor: section.collapsible
            ? "pointer"
            : "default",
          fontWeight: "600",
        }}
      >
        {section.label}
      </div>

      {expanded && (
        <div
          style={{
            padding: "20px",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {fields.map((field) => (
            <div key={field.key}>
              <div
                style={{
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
              >
                {field.label}
              </div>

              <FieldInput
                field={field}
                value={formData[field.key]}
                onChange={(value) =>
                  handleChange(field.key, value)
                }
              />

              {field.helpText && (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: "#57606a",
                  }}
                >
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

export default function DynamicForm({
  schema,
  formData,
  setFormData,
}) {
  const sections = [...schema.sections].sort(
    (a, b) => a.order - b.order
  );

  const fieldsBySection = {};

  for (const section of sections) {
    fieldsBySection[section.key] = schema.fields
      .filter((field) => field.section === section.key)
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