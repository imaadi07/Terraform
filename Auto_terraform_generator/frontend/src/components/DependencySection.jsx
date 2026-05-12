// src/components/DependencySection.jsx

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
}) {
  const [collapsed, setCollapsed] =
    useState(false);

  const mode =
    depMode ||
    dep.resolutionStrategy
      ?.defaultMode ||
    "inline-create";

  const allowModeSwitch =
    dep.resolutionStrategy
      ?.allowModeSwitch !== false;

  const isOptional =
    dep.required === false;

  const currentValues =
    depFormData[dep.resourceType] ||
    {};

  function handleFieldChange(
    key,
    value
  ) {
    setDepFormData((prev) => ({
      ...prev,

      [dep.resourceType]: {
        ...(prev[
          dep.resourceType
        ] || {}),

        [key]: value,
      },
    }));
  }

  const accentColor =
    mode === "existing"
      ? "#1A73E8"
      : "#8C4FFF";

  const accentBg =
    mode === "existing"
      ? "rgba(26,115,232,0.07)"
      : "rgba(140,79,255,0.08)";

  const accentBorder =
    mode === "existing"
      ? "rgba(26,115,232,0.25)"
      : "rgba(140,79,255,0.25)";

  return (
    <div
      style={{
        border: `2px solid ${accentColor}`,

        borderRadius: "12px",

        marginBottom: "32px",

        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: accentBg,

          borderBottom: `1px solid ${accentBorder}`,

          padding: "14px 20px",

          display: "flex",

          alignItems: "center",

          gap: "12px",

          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            background: accentColor,

            color: "#fff",

            fontSize: "11px",

            fontWeight: "700",

            padding: "2px 10px",

            borderRadius: "20px",

            letterSpacing: "0.05em",

            textTransform: "uppercase",
          }}
        >
          {isOptional
            ? "Optional Dependency"
            : "Required Dependency"}
        </span>

        <span
          style={{
            fontWeight: "700",

            fontSize: "15px",

            flex: 1,
          }}
        >
          {depSchema.displayName}
        </span>

        <span
          style={{
            fontSize: "12px",

            color: "#57606a",

            fontFamily:
              "monospace",
          }}
        >
          {depSchema.terraformType}
        </span>

        {allowModeSwitch && (
          <div
            style={{
              display: "flex",

              borderRadius: "8px",

              border: `1px solid ${accentColor}`,

              overflow: "hidden",
            }}
          >
            {[
              "existing",
              "inline-create",
            ].map((m) => (
              <button
                key={m}
                onClick={(e) => {
                  e.stopPropagation();

                  onModeChange(
                    dep.resourceType,
                    m
                  );
                }}
                style={{
                  padding:
                    "5px 14px",

                  fontSize: "12px",

                  fontWeight: "600",

                  border: "none",

                  cursor: "pointer",

                  background:
                    mode === m
                      ? accentColor
                      : "transparent",

                  color:
                    mode === m
                      ? "#fff"
                      : accentColor,
                }}
              >
                {m === "existing"
                  ? "Use existing"
                  : "Auto-create"}
              </button>
            ))}
          </div>
        )}

        <span
          onClick={() =>
            setCollapsed((c) => !c)
          }
          style={{
            color: accentColor,

            fontWeight: "700",

            fontSize: "18px",

            cursor: "pointer",
          }}
        >
          {collapsed ? "+" : "−"}
        </span>
      </div>

      {/* Reason */}
      {!collapsed && (
        <div
          style={{
            background: accentBg,

            borderBottom: `1px solid ${accentBorder}`,

            padding: "10px 20px",

            fontSize: "13px",

            color: "#57606a",
          }}
        >
          {dep.reason}
        </div>
      )}

      {/* Body */}
      {!collapsed && (
        <div
          style={{
            padding: "20px",
          }}
        >
          {mode === "existing" ? (
            <ExistingModeInput
              dep={dep}
              depSchema={depSchema}
              currentValues={
                currentValues
              }
              onFieldChange={
                handleFieldChange
              }
              accentColor={
                accentColor
              }
            />
          ) : (
            <DynamicForm
              schema={depSchema}
              formData={
                currentValues
              }
              setFormData={(
                updater
              ) => {
                const next =
                  typeof updater ===
                  "function"
                    ? updater(
                        currentValues
                      )
                    : updater;

                setDepFormData(
                  (prev) => ({
                    ...prev,

                    [dep.resourceType]:
                      next,
                  })
                );
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Existing resource selector
 */
function ExistingModeInput({
  dep,
  depSchema,
  currentValues,
  onFieldChange,
  accentColor,
}) {
  const idFieldKey =
    dep.linkField;

  /**
   * IMPORTANT:
   * Existing infra discovery should
   * come from dependency config,
   * NOT schema fields.
   */
  const source =
    dep.existingDataSource;

  const label =
    dep.existingLabel ||
    dep.displayName ||
    dep.linkField;

  const [options, setOptions] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadOptions() {
      if (!source?.endpoint) {
        return;
      }

      try {
        setLoading(true);

        setError("");

        const res = await axios.get(
          `${API_BASE}${source.endpoint}`
        );

        setOptions(
          res.data.data || []
        );
      } catch (err) {
        console.error(err);

        setError(
          "Failed to load existing resources"
        );
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, [source]);

  return (
    <div>
      <div
        style={{
          background:
            "rgba(26,115,232,0.04)",

          border:
            "1px dashed rgba(26,115,232,0.35)",

          borderRadius: "8px",

          padding: "16px 20px",

          marginBottom: "16px",

          fontSize: "13px",

          color: "#57606a",
        }}
      >
        In{" "}
        <strong>
          Use existing
        </strong>{" "}
        mode the system will
        reference infrastructure
        already present in AWS.
      </div>

      <label
        style={{
          display: "block",

          fontWeight: "600",

          marginBottom: "8px",
        }}
      >
        {label}

        <span
          style={{
            color: "#cf222e",

            marginLeft: "4px",
          }}
        >
          *
        </span>
      </label>

      <select
        value={
          currentValues[
            idFieldKey
          ] || ""
        }
        onChange={(e) =>
          onFieldChange(
            idFieldKey,
            e.target.value
          )
        }
        style={{
          width: "100%",

          boxSizing:
            "border-box",

          background: "#fff",

          border: `1.5px solid ${accentColor}`,

          borderRadius: "6px",

          color: "#24292f",

          fontSize: "14px",

          padding: "10px 12px",

          outline: "none",
        }}
      >
        <option value="">
          {loading
            ? "Loading existing resources..."
            : `Select existing ${dep.displayName}`}
        </option>

        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
          >
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <div
          style={{
            marginTop: "8px",

            color: "#cf222e",

            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}