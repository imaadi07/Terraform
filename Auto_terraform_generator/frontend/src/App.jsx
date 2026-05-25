import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { ThemeProvider } from "./context/ThemeContext";
import { getProvider } from "./config/providers.jsx";

import Navbar from "./components/Navbar";
import ProviderPage from "./components/ProviderPage";
import ResourceListPage from "./components/ResourceListPage";
import DynamicForm from "./components/DynamicForm";
import DependencySection from "./components/DependencySection";

const API_BASE = "http://localhost:5000/api";

// ─── Helpers (unchanged logic from original) ─────────────────────────────────

function initFormData(schema) {
  const data = {};
  for (const field of schema.fields || []) {
    if (field.default !== undefined) data[field.key] = field.default;
  }
  return data;
}

function matchesCondition(condition, values) {
  if (!condition?.field) return true;
  return values?.[condition.field] === condition.equals;
}

function shouldIncludeField(field, values) {
  if (field.visibleWhen && !matchesCondition(field.visibleWhen, values)) {
    return false;
  }

  if (field.omitWhen && matchesCondition(field.omitWhen, values)) {
    return false;
  }

  return true;
}

function findMissingRequiredField(schema, values) {
  for (const field of schema.fields || []) {
    if (!field.required || field.uiOnly) continue;
    if (!shouldIncludeField(field, values)) continue;

    const value = values?.[field.key];
    if (value === undefined || value === null || value === "") {
      return `${field.label} is required.`;
    }
  }

  return "";
}

async function loadDependencyTree(resourceSchema, collected = {}) {
  for (const dep of resourceSchema.dependencies || []) {
    if (collected[dep.resourceType]) continue;
    const res = await axios.get(`${API_BASE}/schema/${dep.resourceType}`);
    const depSchema = res.data.data;
    collected[dep.resourceType] = depSchema;
    await loadDependencyTree(depSchema, collected);
  }
  return collected;
}

function buildDefaultModes(schema, depSchemas, modes = {}) {
  for (const dep of schema.dependencies || []) {
    if (!modes[dep.resourceType])
      modes[dep.resourceType] = dep.resolutionStrategy?.defaultMode || "inline-create";
    const child = depSchemas[dep.resourceType];
    if (child) buildDefaultModes(child, depSchemas, modes);
  }
  return modes;
}

function buildDefaultDepFormData(depSchemas) {
  const out = {};
  for (const [rt, schema] of Object.entries(depSchemas)) out[rt] = initFormData(schema);
  return out;
}

function flattenDependencyResolution(items = {}, output = {}) {
  for (const [resourceType, item] of Object.entries(items)) {
    output[resourceType] = item;
    flattenDependencyResolution(item.dependencies, output);
  }
  return output;
}

function buildDependencyPayload(
  schema,
  depSchemas,
  depModes,
  depFormData,
  dependencyResolution,
  primaryFormData = {},
  output = {},
) {
  for (const dep of schema.dependencies || []) {
    const resolution = dependencyResolution[dep.resourceType];
    const mode = resolution?.status === "resolved"
      ? "existing"
      : depModes[dep.resourceType] || dep.resolutionStrategy?.defaultMode || "inline-create";
    const selectedValue =
      primaryFormData[dep.linkField] || resolution?.selected?.value || "";
    const values = {
      ...(depFormData[dep.resourceType] || {}),
      ...(mode === "existing" && selectedValue
        ? { [dep.linkField]: selectedValue }
        : {}),
    };

    output[dep.resourceType] = { mode, values };

    if (mode === "inline-create") {
      const child = depSchemas[dep.resourceType];
      if (child) {
        buildDependencyPayload(
          child,
          depSchemas,
          depModes,
          depFormData,
          dependencyResolution,
          primaryFormData,
          output,
        );
      }
    }
  }
  return output;
}

function hasMissingDependencies(schema, dependencyResolution) {
  for (const dep of schema.dependencies || []) {
    const resolution = dependencyResolution[dep.resourceType];
    if (!resolution || resolution.status !== "resolved") return true;
  }
  return false;
}

function findMissingDependencyField(
  schema,
  depSchemas,
  depModes,
  depFormData,
  dependencyResolution,
) {
  for (const dep of schema.dependencies || []) {
    const resolution = dependencyResolution[dep.resourceType];
    const mode = resolution?.status === "resolved"
      ? "existing"
      : depModes[dep.resourceType] || dep.resolutionStrategy?.defaultMode || "inline-create";

    if (mode !== "inline-create") continue;

    const depSchema = depSchemas[dep.resourceType];
    if (!depSchema) continue;

    const missingField = findMissingRequiredField(
      depSchema,
      depFormData[dep.resourceType] || {},
    );

    if (missingField) {
      return `${depSchema.displayName}: ${missingField}`;
    }

    const nestedMissing = findMissingDependencyField(
      depSchema,
      depSchemas,
      depModes,
      depFormData,
      dependencyResolution,
    );

    if (nestedMissing) return nestedMissing;
  }

  return "";
}

// ─── Recursive dependency renderer ───────────────────────────────────────────

function RecursiveDeps({
  schema,
  depSchemas,
  depModes,
  depFormData,
  setDepModes,
  setDepFormData,
  dependencyResolution = {},
  parentFormData = {},
  level = 0,
}) {
  const deps = schema.dependencies || [];
  if (!deps.length) return null;

  return (
    <div style={{ marginLeft: level > 0 ? 24 : 0, marginTop: level > 0 ? 16 : 0 }}>
      {deps.map((dep) => {
        const depSchema = depSchemas[dep.resourceType];
        if (!depSchema) return null;
        const resolution = dependencyResolution[dep.resourceType];
        if (resolution?.status === "resolved") return null;
        const mode = depModes[dep.resourceType] || dep.resolutionStrategy?.defaultMode || "inline-create";

        return (
          <div key={`${dep.resourceType}-${level}`} style={{ marginBottom: 20 }}>
            <DependencySection
              dep={dep}
              depSchema={depSchema}
              parentSchema={schema}
              depMode={mode}
              depFormData={depFormData}
              setDepFormData={setDepFormData}
              parentFormData={parentFormData}
              onModeChange={(resourceType, newMode) => {
                setDepModes((prev) => ({ ...prev, [resourceType]: newMode }));
                if (newMode === "existing") {
                  const clear = (s) => {
                    for (const d of s.dependencies || []) {
                      setDepModes((p) => { const n = { ...p }; delete n[d.resourceType]; return n; });
                      setDepFormData((p) => { const n = { ...p }; delete n[d.resourceType]; return n; });
                      const cs = depSchemas[d.resourceType];
                      if (cs) clear(cs);
                    }
                  };
                  const cs = depSchemas[resourceType];
                  if (cs) clear(cs);
                }
              }}
            />
            {mode === "inline-create" && (
              <RecursiveDeps
                schema={depSchema}
                depSchemas={depSchemas}
                depModes={depModes}
                depFormData={depFormData}
                setDepModes={setDepModes}
                setDepFormData={setDepFormData}
                dependencyResolution={dependencyResolution}
                parentFormData={depFormData[dep.resourceType] || {}}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Form + Generate page ─────────────────────────────────────────────────────

function FormPage({ selectedResource, providerKey, onBack }) {
  const [schema, setSchema] = useState(null);
  const [formData, setFormData] = useState({});
  const [depSchemas, setDepSchemas] = useState({});
  const [depFormData, setDepFormData] = useState({});
  const [depModes, setDepModes] = useState({});
  const [dependencyResolution, setDependencyResolution] = useState({});
  const [loadingDependencies, setLoadingDependencies] = useState(false);
  const [terraformOutput, setTerraformOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const provider = getProvider(providerKey);

  useEffect(() => {
    async function load() {
      try {
        setLoadingSchema(true);
        setError("");
        const res = await axios.get(`${API_BASE}/schema/${selectedResource}`);
        const primarySchema = res.data.data;
        const allDepSchemas = await loadDependencyTree(primarySchema);
        const defaultFormData = initFormData(primarySchema);
        const defaultDepFormData = buildDefaultDepFormData(allDepSchemas);
        setSchema(primarySchema);
        setFormData(defaultFormData);
        setDepSchemas(allDepSchemas);
        setDepModes(buildDefaultModes(primarySchema, allDepSchemas));
        setDepFormData(defaultDepFormData);
        setDependencyResolution({});
        setLoadingDependencies(false);
        setTerraformOutput("");

        if ((primarySchema.dependencies || []).length > 0) {
          setLoadingDependencies(true);
          try {
            const resolutionRes = await axios.post(
              `${API_BASE}/dependencies/resolve/${selectedResource}`,
              { context: defaultFormData },
            );
            const resolutionTree = resolutionRes.data.data?.dependencies || {};
            const flatResolution = flattenDependencyResolution(resolutionTree);

            setDependencyResolution(flatResolution);
            setDepModes((prev) => {
              const next = { ...prev };
              for (const [resourceType, item] of Object.entries(flatResolution)) {
                next[resourceType] =
                  item.status === "resolved" ? "existing" : item.mode || next[resourceType];
              }
              return next;
            });
            setDepFormData((prev) => {
              const next = { ...prev };
              for (const [resourceType, item] of Object.entries(flatResolution)) {
                if (item.status !== "resolved" || !item.linkField || !item.selected?.value) continue;
                next[resourceType] = {
                  ...(next[resourceType] || {}),
                  [item.linkField]: item.selected.value,
                };
              }
              return next;
            });
            setFormData((prev) => {
              const next = { ...prev };
              for (const dep of primarySchema.dependencies || []) {
                const item = flatResolution[dep.resourceType];
                if (item?.status === "resolved" && item.selected?.value) {
                  next[dep.linkField] = item.selected.value;
                }
              }
              return next;
            });
          } catch (err) {
            console.error(err);
            setDependencyResolution({});
          } finally {
            setLoadingDependencies(false);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load schema");
      } finally {
        setLoadingSchema(false);
      }
    }
    load();
  }, [selectedResource]);

  const dependencyPayload = useMemo(() => {
    if (!schema) return {};
    return buildDependencyPayload(
      schema,
      depSchemas,
      depModes,
      depFormData,
      dependencyResolution,
      formData,
    );
  }, [schema, depSchemas, depModes, depFormData, dependencyResolution, formData]);

  async function generate() {
    try {
      setLoading(true);
      setError("");

      const missingPrimaryField = findMissingRequiredField(schema, formData);
      if (missingPrimaryField) {
        setError(missingPrimaryField);
        return;
      }

      const missingDependencyField = findMissingDependencyField(
        schema,
        depSchemas,
        depModes,
        depFormData,
        dependencyResolution,
      );
      if (missingDependencyField) {
        setError(missingDependencyField);
        return;
      }

      const hasDeps = (schema?.dependencies || []).length > 0;
      if (hasDeps) {
        const res = await axios.post(`${API_BASE}/terraform/multi/${selectedResource}`, {
          primary: formData,
          dependencies: dependencyPayload,
        });
        setTerraformOutput(res.data.terraform);
      } else {
        const res = await axios.post(`${API_BASE}/terraform/${selectedResource}`, formData);
        setTerraformOutput(res.data.terraform);
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || "Terraform generation failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(terraformOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loadingSchema) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--text-muted)" }}>
        Loading schema…
      </div>
    );
  }

  if (!schema) return null;

  const hasDependencies = (schema.dependencies || []).length > 0;
  const hasFallbackDependencies =
    hasDependencies && !loadingDependencies && hasMissingDependencies(schema, dependencyResolution);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 28px 80px" }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 28,
          padding: "7px 16px",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--surface)",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        ← Back to resources
      </button>

      {/* Title */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 32,
        flexWrap: "wrap",
      }}>
        <div style={{
          padding: "4px 14px",
          borderRadius: 20,
          background: provider.bgColor,
          border: `1px solid ${provider.borderColor}`,
          fontSize: 12,
          fontWeight: 700,
          color: provider.color,
        }}>
          {provider.shortLabel}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px" }}>
          {schema.displayName}
        </h1>
        <code style={{
          fontSize: 12,
          color: "var(--text-dim)",
          background: "var(--surface-3)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "3px 10px",
          fontFamily: "var(--mono)",
        }}>
          {schema.terraformType}
        </code>
      </div>

      {/* Primary form */}
      <DynamicForm schema={schema} formData={formData} setFormData={setFormData} />

      {loadingDependencies && hasDependencies && (
        <div style={{ marginTop: 28, color: "var(--text-muted)", fontSize: 13 }}>
          Checking existing infrastructure...
        </div>
      )}

      {/* Fallback dependencies */}
      {hasFallbackDependencies && (
        <div style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, color: "var(--text)" }}>
            Dependencies
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
            Create only the required infrastructure that was not found in the cloud account.
          </p>
          <RecursiveDeps
            schema={schema}
            depSchemas={depSchemas}
            depModes={depModes}
            depFormData={depFormData}
            setDepModes={setDepModes}
            setDepFormData={setDepFormData}
            dependencyResolution={dependencyResolution}
            parentFormData={formData}
          />
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={loading}
        style={{
          marginTop: 28,
          padding: "13px 28px",
          border: "none",
          borderRadius: 10,
          background: loading ? "var(--border)" : provider.color,
          color: providerKey === "aws" ? "#000" : "#fff",
          fontWeight: 800,
          fontSize: 15,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "all 0.15s",
          letterSpacing: "0.01em",
        }}
      >
        {loading ? "Generating…" : "⚡ Generate Terraform"}
      </button>

      {error && (
        <div style={{
          marginTop: 16,
          padding: "12px 16px",
          background: "var(--error-bg)",
          border: "1px solid var(--error-border)",
          borderRadius: 8,
          color: "var(--error)",
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Output */}
      {terraformOutput && (
        <div style={{ marginTop: 48 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 10,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
              Generated Terraform
            </h2>
            <button
              onClick={handleCopy}
              style={{
                border: "none",
                background: copied ? "#1a7f37" : "#238636",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
                transition: "background 0.2s",
              }}
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <pre style={{
            background: "#0d1117",
            color: "#c9d1d9",
            padding: 24,
            borderRadius: 10,
            overflowX: "auto",
            fontSize: 13,
            lineHeight: 1.7,
            border: "1px solid #30363d",
            fontFamily: "var(--mono)",
          }}>
            {terraformOutput}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

function AppInner() {
  const [allResources, setAllResources] = useState([]);

  // view: "home" | { type: "list", provider } | { type: "form", provider, resource }
  const [view, setView] = useState("home");

  useEffect(() => {
    axios.get(`${API_BASE}/resources`).then((res) => {
      setAllResources(res.data.data || []);
    }).catch(console.error);
  }, []);

  // Derive unique provider keys from resources, preserving insertion order
  const providerKeys = useMemo(() => {
    const seen = new Set();
    for (const r of allResources) {
      if (r.provider) seen.add(r.provider);
    }
    return [...seen];
  }, [allResources]);

  // Resources filtered to current provider
  const providerResources = useMemo(() => {
    if (!view?.provider) return [];
    return allResources.filter((r) => r.provider === view.provider);
  }, [allResources, view]);

  const navView = view === "home"
    ? "home"
    : view.type === "list"
      ? { provider: view.provider }
      : { provider: view.provider, resource: view.resource };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar
        view={navView}
        onHome={() => setView("home")}
      />

      {view === "home" && (
        <ProviderPage
          providers={providerKeys}
          onSelect={(key) => setView({ type: "list", provider: key })}
        />
      )}

      {view !== "home" && view.type === "list" && (
        <ResourceListPage
          providerKey={view.provider}
          resources={providerResources}
          onSelect={(resourceId) =>
            setView({ type: "form", provider: view.provider, resource: resourceId })
          }
        />
      )}

      {view !== "home" && view.type === "form" && (
        <FormPage
          selectedResource={view.resource}
          providerKey={view.provider}
          onBack={() => setView({ type: "list", provider: view.provider })}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
