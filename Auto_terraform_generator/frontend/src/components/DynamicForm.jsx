import { useState, useRef, useEffect } from "react";

/* ─── type inference ──────────────────────────────────────────────── */
function inferType(field) {
  if (field.validation?.suggestions) return "suggestions"; // AMI-style: preset list + free text
  if (field.validation?.enum)        return "enum";
  if (field.validation?.list)        return "list";
  if (field.validation?.map)         return "map";
  if (field.validation?.multiline)   return "multiline";
  if (typeof field.default === "boolean") return "boolean";
  if (typeof field.default === "number")  return "number";
  return "string";
}

/* ─── shared input style (light theme) ───────────────────────────── */
const inputBase = {
  width: "100%",
  background: "#fff",
  border: "1.5px solid var(--border)",
  borderRadius: "7px",
  color: "var(--text)",
  fontFamily: "var(--mono)",
  fontSize: "13px",
  padding: "8px 12px",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const focusOn = (e) => {
  e.target.style.borderColor = "var(--border-active)";
  e.target.style.boxShadow = "0 0 0 3px rgba(9,105,218,0.12)";
};
const focusOff = (e) => {
  e.target.style.borderColor = "var(--border)";
  e.target.style.boxShadow = "none";
};

/* ─── Toggle ──────────────────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "4px" }}>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: "40px", height: "22px", borderRadius: "11px",
          background: value ? "var(--accent)" : "var(--surface-2)",
          border: `1.5px solid ${value ? "var(--accent)" : "var(--border)"}`,
          cursor: "pointer", position: "relative",
          transition: "background 0.2s, border-color 0.2s", flexShrink: 0,
        }}
      >
        <div style={{
          position: "absolute", top: "3px",
          left: value ? "20px" : "3px",
          width: "14px", height: "14px", borderRadius: "50%",
          background: value ? "#fff" : "var(--text-dim)",
          transition: "left 0.18s, background 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </div>
      <span style={{ fontFamily: "var(--mono)", fontSize: "12px", color: value ? "var(--accent)" : "var(--text-muted)", fontWeight: "500" }}>
        {value ? "true" : "false"}
      </span>
    </div>
  );
}

/* ─── Searchable enum dropdown ───────────────────────────────────── */
function SearchableSelect({ field, value, onChange }) {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState("");
  const wrapRef               = useRef(null);
  const inputRef              = useRef(null);

  const options = field.validation.enum;
  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen((p) => !p)}
        style={{
          ...inputBase,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", userSelect: "none",
          borderColor: open ? "var(--border-active)" : "var(--border)",
          boxShadow: open ? "0 0 0 3px rgba(9,105,218,0.12)" : "none",
        }}
      >
        <span style={{ color: value ? "var(--text)" : "var(--text-dim)" }}>
          {value || "Select instance type"}
        </span>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M4 6l4 4 4-4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "#fff", border: "1.5px solid var(--border)",
          borderRadius: "8px", boxShadow: "var(--shadow-md)",
          overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "8px", borderBottom: "1px solid var(--border)" }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search instance types..."
              style={{
                ...inputBase,
                padding: "6px 10px", fontSize: "12px",
                borderColor: "var(--border)",
              }}
              onFocus={focusOn} onBlur={focusOff}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px", textAlign: "center", color: "var(--text-dim)", fontSize: "12px", fontFamily: "var(--mono)" }}>
                no results
              </div>
            ) : filtered.map((opt) => (
              <div
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                style={{
                  padding: "8px 12px",
                  fontFamily: "var(--mono)", fontSize: "13px",
                  color: opt === value ? "var(--border-active)" : "var(--text)",
                  background: opt === value ? "rgba(9,105,218,0.06)" : "transparent",
                  cursor: "pointer",
                  borderLeft: opt === value ? "2px solid var(--border-active)" : "2px solid transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (opt !== value) e.currentTarget.style.background = "var(--surface-2)"; }}
                onMouseLeave={(e) => { if (opt !== value) e.currentTarget.style.background = "transparent"; }}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── AMI suggestions input (preset list + free text) ───────────── */
function SuggestionsInput({ field, value, onChange }) {
  const [mode, setMode] = useState("preset"); // "preset" | "custom"
  const suggestions = field.validation.suggestions;

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "0", marginBottom: "8px", border: "1.5px solid var(--border)", borderRadius: "7px", overflow: "hidden", width: "fit-content" }}>
        {["preset", "custom"].map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); if (m === "preset") onChange(""); }}
            style={{
              padding: "5px 14px",
              background: mode === m ? "var(--border-active)" : "transparent",
              color: mode === m ? "#fff" : "var(--text-muted)",
              border: "none", cursor: "pointer",
              fontFamily: "var(--mono)", fontSize: "11px", fontWeight: "500",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {m === "preset" ? "Quick select" : "Enter ID"}
          </button>
        ))}
      </div>

      {mode === "preset" ? (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...inputBase,
            cursor: "pointer",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%235a6270' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
            paddingRight: "30px", appearance: "none",
          }}
          onFocus={focusOn} onBlur={focusOff}
        >
          <option value="">— select an AMI —</option>
          {suggestions.map((s) => (
            <option key={s.value} value={s.value}>{s.label} — {s.value}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ami-0c55b159cbfafe1f0"
          style={inputBase}
          onFocus={focusOn} onBlur={focusOff}
        />
      )}

      {value && (
        <div style={{ marginTop: "5px", display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--accent)" }}>{value}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Main field renderer ─────────────────────────────────────────── */
function FieldInput({ field, value, onChange }) {
  const type = inferType(field);

  if (type === "boolean") return <Toggle value={!!value} onChange={onChange} />;

  if (type === "suggestions") return <SuggestionsInput field={field} value={value} onChange={onChange} />;

  if (type === "enum") {
    // Use searchable dropdown for large lists, native select for small ones
    if (field.validation.enum.length > 8) {
      return <SearchableSelect field={field} value={value} onChange={onChange} />;
    }
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputBase, cursor: "pointer", appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%235a6270' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "30px",
        }}
        onFocus={focusOn} onBlur={focusOff}
      >
        {!field.required && <option value="">— unset —</option>}
        {field.validation.enum.map((opt) => (
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
        placeholder={field.validation?.min !== undefined ? `min ${field.validation.min}` : "0"}
        style={inputBase}
        onFocus={focusOn} onBlur={focusOff}
      />
    );
  }

  if (type === "list") {
    const displayVal = Array.isArray(value) ? value.join(", ") : (value ?? "");
    return (
      <div>
        <input
          type="text"
          value={displayVal}
          onChange={(e) => onChange(e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
          placeholder="sg-xxxxxxxx, sg-yyyyyyyy"
          style={inputBase}
          onFocus={focusOn} onBlur={focusOff}
        />
        <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--mono)" }}>
          comma-separated values
        </div>
      </div>
    );
  }

  if (type === "map") {
    const mapObj = (typeof value === "object" && value !== null) ? value : {};
    const mapStr = Object.entries(mapObj).map(([k, v]) => `${k} = ${v}`).join("\n");
    return (
      <div>
        <textarea
          value={mapStr}
          onChange={(e) => {
            const parsed = {};
            e.target.value.split("\n").forEach((line) => {
              const idx = line.indexOf("=");
              if (idx > 0) {
                const k = line.slice(0, idx).trim();
                const v = line.slice(idx + 1).trim();
                if (k) parsed[k] = v;
              }
            });
            onChange(parsed);
          }}
          rows={3}
          placeholder={"Name = MyServer\nEnvironment = Production"}
          style={{ ...inputBase, resize: "vertical", lineHeight: "1.6" }}
          onFocus={focusOn} onBlur={focusOff}
        />
        <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--mono)" }}>
          one key = value per line
        </div>
      </div>
    );
  }

  if (type === "multiline") {
    return (
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={"#!/bin/bash\necho 'hello world'"}
        style={{ ...inputBase, resize: "vertical", lineHeight: "1.6" }}
        onFocus={focusOn} onBlur={focusOff}
      />
    );
  }

  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Enter ${field.label.toLowerCase()}`}
      style={inputBase}
      onFocus={focusOn} onBlur={focusOff}
    />
  );
}

/* ─── Section card ────────────────────────────────────────────────── */
function SectionCard({ section, fields, formData, setFormData }) {
  const [expanded, setExpanded] = useState(section.defaultExpanded ?? true);

  function handleChange(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div style={{
      background: "var(--surface)",
      border: "1.5px solid var(--border)",
      borderRadius: "10px",
      overflow: "hidden",
      marginBottom: "14px",
      boxShadow: "var(--shadow-sm)",
    }}>
      {/* Header */}
      <div
        onClick={() => section.collapsible && setExpanded((p) => !p)}
        style={{
          padding: "13px 18px",
          borderBottom: expanded ? "1.5px solid var(--border)" : "none",
          display: "flex", alignItems: "center", gap: "10px",
          background: "var(--section-header)",
          cursor: section.collapsible ? "pointer" : "default",
          userSelect: "none",
        }}
      >
        <span style={{
          fontFamily: "var(--sans)", fontSize: "13px", fontWeight: "700",
          color: "var(--text)", letterSpacing: "0.01em",
        }}>
          {section.label}
        </span>
        <span style={{
          fontFamily: "var(--mono)", fontSize: "10px", color: "var(--text-dim)",
          background: "var(--tag-bg)", border: "1px solid var(--border)",
          borderRadius: "4px", padding: "1px 7px",
        }}>
          {fields.length} field{fields.length !== 1 ? "s" : ""}
        </span>
        {section.collapsible && (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
            style={{ marginLeft: "auto", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            <path d="M4 6l4 4 4-4" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Body */}
      {expanded && (
        <div style={{
          padding: "20px 18px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
          gap: "20px",
        }}>
          {fields.map((field) => (
            <div key={field.key}>
              {/* Label row */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "7px" }}>
                <label style={{
                  fontFamily: "var(--sans)", fontSize: "12px", fontWeight: "600",
                  color: "var(--text)", letterSpacing: "0.01em",
                }}>
                  {field.label}
                </label>
                {field.required && (
                  <span style={{
                    fontSize: "10px", fontFamily: "var(--mono)",
                    background: "#fff0ee", color: "var(--error)",
                    border: "1px solid var(--error-border)",
                    borderRadius: "3px", padding: "0 5px", lineHeight: "16px",
                  }}>
                    required
                  </span>
                )}
              </div>

              <FieldInput
                field={field}
                value={formData[field.key]}
                onChange={(val) => handleChange(field.key, val)}
              />

              {field.helpText && (
                <div style={{
                  marginTop: "6px", fontSize: "11px",
                  color: "var(--text-muted)", fontFamily: "var(--mono)", lineHeight: "1.5",
                }}>
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

/* ─── Root export ─────────────────────────────────────────────────── */
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
      {sections.map((section) =>
        fieldsBySection[section.key]?.length > 0 ? (
          <SectionCard
            key={section.key}
            section={section}
            fields={fieldsBySection[section.key]}
            formData={formData}
            setFormData={setFormData}
          />
        ) : null
      )}
    </div>
  );
}
