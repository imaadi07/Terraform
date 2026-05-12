// src/App.jsx

import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import DynamicForm from "./components/DynamicForm";
import ResourceSelector from "./components/ResourceSelector";
import DependencySection from "./components/DependencySection";

const API_BASE = "http://localhost:5000/api";

function initFormData(schema) {
  const data = {};

  for (const field of schema.fields || []) {
    if (field.default !== undefined) {
      data[field.key] = field.default;
    }
  }

  return data;
}

async function loadDependencyTree(resourceSchema, collected = {}) {
  const deps = resourceSchema.dependencies || [];

  for (const dep of deps) {
    if (collected[dep.resourceType]) {
      continue;
    }

    const res = await axios.get(`${API_BASE}/schema/${dep.resourceType}`);

    const depSchema = res.data.data;

    collected[dep.resourceType] = depSchema;

    await loadDependencyTree(depSchema, collected);
  }

  return collected;
}

function buildDefaultModes(schema, depSchemas, modes = {}) {
  const deps = schema.dependencies || [];

  for (const dep of deps) {
    if (!modes[dep.resourceType]) {
      modes[dep.resourceType] =
        dep.resolutionStrategy?.defaultMode || "inline-create";
    }

    const childSchema = depSchemas[dep.resourceType];

    if (childSchema) {
      buildDefaultModes(childSchema, depSchemas, modes);
    }
  }

  return modes;
}

function buildDefaultDepFormData(depSchemas) {
  const out = {};

  for (const [resourceType, schema] of Object.entries(depSchemas)) {
    out[resourceType] = initFormData(schema);
  }

  return out;
}

function buildDependencyPayloadRecursive(
  schema,
  depSchemas,
  depModes,
  depFormData,
  output = {},
) {
  const deps = schema.dependencies || [];

  for (const dep of deps) {
    const mode =
      depModes[dep.resourceType] ||
      dep.resolutionStrategy?.defaultMode ||
      "inline-create";

    output[dep.resourceType] = {
      mode,

      values: depFormData[dep.resourceType] || {},
    };

    if (mode === "inline-create") {
      const childSchema = depSchemas[dep.resourceType];

      if (childSchema) {
        buildDependencyPayloadRecursive(
          childSchema,
          depSchemas,
          depModes,
          depFormData,
          output,
        );
      }
    }
  }

  return output;
}

function RecursiveDependencyRenderer({
  schema,
  depSchemas,
  depModes,
  depFormData,
  setDepModes,
  setDepFormData,
  level = 0,
}) {
  const deps = schema.dependencies || [];

  if (deps.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginLeft: level > 0 ? "24px" : 0,

        marginTop: level > 0 ? "20px" : 0,
      }}
    >
      {deps.map((dep) => {
        const depSchema = depSchemas[dep.resourceType];

        if (!depSchema) {
          return null;
        }

        const mode =
          depModes[dep.resourceType] ||
          dep.resolutionStrategy?.defaultMode ||
          "inline-create";

        return (
          <div
            key={`${dep.resourceType}-${level}`}
            style={{
              marginBottom: "24px",
            }}
          >
            <DependencySection
              dep={dep}
              depSchema={depSchema}
              depMode={mode}
              depFormData={depFormData}
              setDepFormData={setDepFormData}
              onModeChange={(resourceType, newMode) => {
                setDepModes((prev) => ({
                  ...prev,

                  [resourceType]: newMode,
                }));

                if (newMode === "existing") {
                  const clearNestedDeps = (schema) => {
                    const deps = schema.dependencies || [];

                    for (const childDep of deps) {
                      setDepModes((prev) => {
                        const next = {
                          ...prev,
                        };

                        delete next[childDep.resourceType];

                        return next;
                      });

                      setDepFormData((prev) => {
                        const next = {
                          ...prev,
                        };

                        delete next[childDep.resourceType];

                        return next;
                      });

                      const childSchema = depSchemas[childDep.resourceType];

                      if (childSchema) {
                        clearNestedDeps(childSchema);
                      }
                    }
                  };

                  const currentSchema = depSchemas[resourceType];

                  if (currentSchema) {
                    clearNestedDeps(currentSchema);
                  }
                }
              }}
            />

            {mode === "inline-create" && (
              <RecursiveDependencyRenderer
                schema={depSchema}
                depSchemas={depSchemas}
                depModes={depModes}
                depFormData={depFormData}
                setDepModes={setDepModes}
                setDepFormData={setDepFormData}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [resources, setResources] = useState([]);

  const [selectedResource, setSelectedResource] = useState(null);

  const [schema, setSchema] = useState(null);

  const [formData, setFormData] = useState({});

  const [depSchemas, setDepSchemas] = useState({});

  const [depFormData, setDepFormData] = useState({});

  const [depModes, setDepModes] = useState({});

  const [terraformOutput, setTerraformOutput] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResources() {
      try {
        const res = await axios.get(`${API_BASE}/resources`);

        setResources(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    }

    loadResources();
  }, []);

  useEffect(() => {
    if (!selectedResource) {
      return;
    }

    async function loadSchemas() {
      try {
        setError("");

        const res = await axios.get(`${API_BASE}/schema/${selectedResource}`);

        const primarySchema = res.data.data;

        const allDepSchemas = await loadDependencyTree(primarySchema);

        const initialModes = buildDefaultModes(primarySchema, allDepSchemas);

        const initialDepFormData = buildDefaultDepFormData(allDepSchemas);

        setSchema(primarySchema);

        setFormData(initFormData(primarySchema));

        setDepSchemas(allDepSchemas);

        setDepModes(initialModes);

        setDepFormData(initialDepFormData);

        setTerraformOutput("");
      } catch (err) {
        console.error(err);

        setError("Failed to load schemas");
      }
    }

    loadSchemas();
  }, [selectedResource]);

  const dependencyPayload = useMemo(() => {
    if (!schema) {
      return {};
    }

    return buildDependencyPayloadRecursive(
      schema,
      depSchemas,
      depModes,
      depFormData,
    );
  }, [schema, depSchemas, depModes, depFormData]);

  async function generateTerraform() {
    try {
      setLoading(true);

      setError("");

      const hasDeps = (schema?.dependencies || []).length > 0;

      if (hasDeps) {
        const res = await axios.post(
          `${API_BASE}/terraform/multi/${selectedResource}`,
          {
            primary: formData,

            dependencies: dependencyPayload,
          },
        );

        setTerraformOutput(res.data.terraform);
      } else {
        const res = await axios.post(
          `${API_BASE}/terraform/${selectedResource}`,
          formData,
        );

        setTerraformOutput(res.data.terraform);
      }
    } catch (err) {
      console.error(err);

      setError(err?.response?.data?.error || "Terraform generation failed");
    } finally {
      setLoading(false);
    }
  }

  const hasDependencies = (schema?.dependencies || []).length > 0;

  return (
    <div
      style={{
        maxWidth: "1400px",

        margin: "0 auto",

        padding: "40px",
      }}
    >
      <h1
        style={{
          marginBottom: "24px",
        }}
      >
        Terraform Infrastructure Generator
      </h1>

      <h2
        style={{
          marginBottom: "16px",

          fontSize: "18px",
        }}
      >
        Select Resource
      </h2>

      <ResourceSelector
        resources={resources}
        selectedResource={selectedResource}
        onSelect={setSelectedResource}
      />

      {schema && (
        <>
          <div
            style={{
              marginTop: "40px",
            }}
          >
            {/* Primary Form FIRST */}
            <h2
              style={{
                marginBottom: "16px",
              }}
            >
              {schema.displayName}
            </h2>

            <DynamicForm
              schema={schema}
              formData={formData}
              setFormData={setFormData}
            />

            {/* Dependencies BELOW */}
            {hasDependencies && (
              <div
                style={{
                  marginTop: "40px",
                }}
              >
                <h2
                  style={{
                    marginBottom: "8px",
                  }}
                >
                  Dependencies
                </h2>

                <p
                  style={{
                    fontSize: "14px",

                    color: "#57606a",

                    marginBottom: "24px",
                  }}
                >
                  Configure infrastructure dependencies.
                </p>

                <RecursiveDependencyRenderer
                  schema={schema}
                  depSchemas={depSchemas}
                  depModes={depModes}
                  depFormData={depFormData}
                  setDepModes={setDepModes}
                  setDepFormData={setDepFormData}
                />
              </div>
            )}

            <button
              onClick={generateTerraform}
              disabled={loading}
              style={{
                marginTop: "24px",

                padding: "12px 20px",

                border: "none",

                borderRadius: "8px",

                background: "#FF9900",

                color: "#000",

                fontWeight: "700",

                cursor: "pointer",

                fontSize: "15px",
              }}
            >
              {loading ? "Generating..." : "Generate Terraform"}
            </button>

            {error && (
              <div
                style={{
                  color: "red",

                  marginTop: "16px",
                }}
              >
                {error}
              </div>
            )}
          </div>

          {terraformOutput && (
            <div
              style={{
                marginTop: "40px",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  marginBottom: "12px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                  }}
                >
                  Generated Terraform
                </h2>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(terraformOutput);
                  }}
                  style={{
                    border: "none",

                    background: "#238636",

                    color: "#fff",

                    padding: "8px 14px",

                    borderRadius: "8px",

                    cursor: "pointer",

                    fontWeight: "600",

                    fontSize: "13px",
                  }}
                >
                  Copy Terraform
                </button>
              </div>

              {/* Code Block */}
              <div
                style={{
                  position: "relative",
                }}
              >
                <pre
                  style={{
                    background: "#0d1117",

                    color: "#c9d1d9",

                    padding: "24px",

                    borderRadius: "10px",

                    overflowX: "auto",

                    fontSize: "13px",

                    lineHeight: "1.6",

                    border: "1px solid #30363d",
                  }}
                >
                  {terraformOutput}
                </pre>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
