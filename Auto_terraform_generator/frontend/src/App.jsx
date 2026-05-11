import { useEffect, useState } from "react";
import axios from "axios";
import DynamicForm from "./components/DynamicForm";

const API_BASE = "http://localhost:5000/api/terraform";

function initFormData(schema) {
  const data = {};
  for (const field of schema.fields) {
    if (field.default !== undefined) {
      data[field.key] = field.default;
    }
  }
  return data;
}

export default function App() {
  const [schema, setSchema] = useState(null);
  const [formData, setFormData] = useState({});
  const [terraformOutput, setTerraformOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [schemaError, setSchemaError] = useState("");

  useEffect(() => {
    fetchSchema();
  }, []);

  async function fetchSchema() {
    try {
      const res = await axios.get(`${API_BASE}/schema`);
      setSchema(res.data);
      setFormData(initFormData(res.data));
    } catch {
      setSchemaError("Failed to load schema. Is the backend running on port 5000?");
    }
  }

  async function generateTerraform() {
    try {
      setLoading(true);
      setError("");
      const res = await axios.post(`${API_BASE}/generate`, formData);
      setTerraformOutput(res.data.terraform);
    } catch (err) {
      setError(err?.response?.data?.error || "Generation failed. Check required fields.");
    } finally {
      setLoading(false);
    }
  }

  function downloadTerraform() {
    const blob = new Blob([terraformOutput], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "main.tf";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(terraformOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const s = {
    // Layout
    page: { minHeight: "100vh", display: "flex", flexDirection: "column" },
    main: { maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 80px", width: "100%", flex: 1 },
    twoCol: { display: "grid", gridTemplateColumns: "1fr 420px", gap: "24px", alignItems: "start" },

    // Header
    header: {
      borderBottom: "1px solid var(--border)",
      padding: "16px 32px",
      display: "flex",
      alignItems: "center",
      gap: "14px",
      background: "rgba(10,13,18,0.9)",
      backdropFilter: "blur(10px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    },
    logo: {
      width: "34px", height: "34px", borderRadius: "9px",
      background: "linear-gradient(135deg, #FF9900, #e67e00)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    headerTitle: { fontFamily: "var(--sans)", fontSize: "15px", fontWeight: "700", color: "var(--text)", letterSpacing: "-0.01em" },
    headerSub: { fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--mono)", marginTop: "1px" },
    badge: {
      marginLeft: "auto", display: "flex", alignItems: "center", gap: "7px",
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "20px", padding: "4px 12px",
    },
    dot: { width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" },

    // Cards
    card: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" },
    cardHeader: {
      padding: "12px 18px", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", gap: "8px",
      background: "var(--surface-2)", cursor: "pointer", userSelect: "none",
    },
    cardBody: { padding: "20px 18px" },

    // Buttons
    primaryBtn: {
      display: "flex", alignItems: "center", gap: "8px",
      padding: "11px 22px",
      background: "var(--accent)", color: "#0a0d12",
      border: "none", borderRadius: "8px",
      fontFamily: "var(--sans)", fontSize: "14px", fontWeight: "700",
      cursor: "pointer", letterSpacing: "0.01em", transition: "opacity 0.15s",
    },
    disabledBtn: {
      display: "flex", alignItems: "center", gap: "8px",
      padding: "11px 22px",
      background: "var(--accent-dim)", color: "var(--text-muted)",
      border: "none", borderRadius: "8px",
      fontFamily: "var(--sans)", fontSize: "14px", fontWeight: "700",
      cursor: "not-allowed",
    },
    secondaryBtn: {
      display: "flex", alignItems: "center", gap: "6px",
      padding: "9px 16px",
      background: "transparent", color: "var(--text-muted)",
      border: "1px solid var(--border)", borderRadius: "7px",
      fontFamily: "var(--mono)", fontSize: "12px",
      cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
    },
    downloadBtn: {
      display: "flex", alignItems: "center", gap: "7px",
      padding: "10px 20px",
      background: "rgba(56,139,253,0.12)", color: "#388bfd",
      border: "1px solid rgba(56,139,253,0.3)", borderRadius: "8px",
      fontFamily: "var(--sans)", fontSize: "13px", fontWeight: "600",
      cursor: "pointer", transition: "background 0.15s",
    },

    // Error
    errorBanner: {
      background: "var(--error-dim)", border: "1px solid rgba(248,81,73,0.3)",
      borderRadius: "8px", padding: "12px 16px", marginBottom: "20px",
      display: "flex", alignItems: "center", gap: "10px",
      color: "var(--error)", fontFamily: "var(--mono)", fontSize: "13px",
    },

    // Output panel
    outputPanel: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", position: "sticky", top: "80px" },
    outputHeader: {
      padding: "12px 16px", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", gap: "8px",
      background: "var(--surface-2)",
    },
    outputPre: {
      margin: 0, padding: "20px",
      fontFamily: "var(--mono)", fontSize: "12.5px", lineHeight: "1.75",
      color: "#c9d1d9", overflowX: "auto",
      background: "#0d1117", maxHeight: "70vh",
      overflowY: "auto", whiteSpace: "pre",
    },
    emptyOutput: {
      padding: "48px 20px", textAlign: "center",
      color: "var(--text-dim)", fontFamily: "var(--mono)", fontSize: "12px",
    },
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
        .hover-btn:hover { opacity: 0.82 !important; }
        .sec-btn:hover { color: var(--text) !important; border-color: var(--text-muted) !important; }
        .dl-btn:hover { background: rgba(56,139,253,0.2) !important; }
      `}</style>

      {/* Header */}
      <header style={s.header}>
        <div style={s.logo}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div style={s.headerTitle}>Terraform Generator</div>
          <div style={s.headerSub}>schema-driven infrastructure · aws provider</div>
        </div>
        {schema && (
          <div style={s.badge}>
            <div style={s.dot} />
            <span style={{ fontSize: "11px", fontFamily: "var(--mono)", color: "var(--text-muted)" }}>
              {schema.terraformType}
            </span>
          </div>
        )}
      </header>

      <main style={s.main}>
        {/* Schema load error */}
        {schemaError && (
          <div style={s.errorBanner}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 4.5v4M8 10.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {schemaError}
          </div>
        )}

        {/* Loading */}
        {!schema && !schemaError && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", padding: "80px 0", color: "var(--text-muted)" }}>
            <div style={{ width: "28px", height: "28px", border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: "13px" }}>loading schema...</span>
          </div>
        )}

        {schema && (
          <div style={s.twoCol}>
            {/* Left — form */}
            <div>
              {/* Resource header */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: schema.color || "#FF9900" }} />
                  <h1 style={{ fontFamily: "var(--sans)", fontSize: "20px", fontWeight: "800", color: "var(--text)", letterSpacing: "-0.02em" }}>
                    {schema.displayName}
                  </h1>
                </div>
                <p style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-dim)", marginLeft: "20px" }}>
                  provider: {schema.providerKey} · compatible: {schema.compatibleWith}
                </p>
              </div>

              {/* Error */}
              {error && (
                <div style={s.errorBanner}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 4.5v4M8 10.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Sections */}
              <DynamicForm
                schema={schema}
                formData={formData}
                setFormData={setFormData}
                styles={s}
              />

              {/* Generate button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
                <button
                  onClick={generateTerraform}
                  disabled={loading}
                  className={loading ? "" : "hover-btn"}
                  style={loading ? s.disabledBtn : s.primaryBtn}
                >
                  {loading ? (
                    <>
                      <div style={{ width: "14px", height: "14px", border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#0a0d12", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Generate .tf
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right — output */}
            <div style={s.outputPanel}>
              <div style={s.outputHeader}>
                <div style={{ display: "flex", gap: "5px" }}>
                  {["#f85149","#d29922","#3fb950"].map((c,i) => (
                    <div key={i} style={{ width: "9px", height: "9px", borderRadius: "50%", background: c, opacity: 0.7 }} />
                  ))}
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--text-muted)", marginLeft: "6px", flex: 1 }}>
                  main.tf
                </span>
                {terraformOutput && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={copyOutput} className="sec-btn" style={s.secondaryBtn}>
                      {copied ? (
                        <><svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>copied</>
                      ) : (
                        <><svg width="11" height="11" viewBox="0 0 16 16" fill="none"><rect x="4" y="4" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M4 3a1 1 0 011-1h7a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.5"/></svg>copy</>
                      )}
                    </button>
                    <button onClick={downloadTerraform} className="dl-btn" style={s.downloadBtn}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v9M4 8l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 14h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                      </svg>
                      Download
                    </button>
                  </div>
                )}
              </div>

              {terraformOutput ? (
                <pre style={s.outputPre}>{terraformOutput}</pre>
              ) : (
                <div style={s.emptyOutput}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 10px", display: "block", opacity: 0.3 }}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  fill the form and click<br/>Generate .tf to preview
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
