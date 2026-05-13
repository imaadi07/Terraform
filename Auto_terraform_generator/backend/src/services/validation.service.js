import { AppError } from "../utils/error.util.js";

/**
 * Infer the field type from the schema field definition.
 * Since the manifest has no explicit "type" key, we derive it from
 * the default value and validation hints.
 */
export function inferFieldType(field) {
  if (field.validation?.enum || field.enumValues) return "enum";
  if (field.validation?.list) return "list";
  if (field.validation?.map || field.type === "object") return "map";
  if (field.validation?.multiline) return "multiline";
  if (field.type) return field.type;
  if (typeof field.default === "boolean") return "boolean";
  if (typeof field.default === "number") return "number";
  return "string";
}

/**
 * Coerce a raw user value to the correct JS type based on inferred field type.
 */
export function coerceValue(value, type) {
  if (value === undefined || value === null || value === "") return undefined;

  switch (type) {
    case "boolean":
      return value === true || value === "true";
    case "number":
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    case "list":
      if (Array.isArray(value)) return value.filter(Boolean);
      if (typeof value === "string") {
        return value.split(",").map((v) => v.trim()).filter(Boolean);
      }
      return undefined;
    case "map":
      if (typeof value === "object" && !Array.isArray(value)) return value;
      return undefined;
    default:
      return String(value);
  }
}

function matchesCondition(condition, userValues) {
  if (!condition?.field) return true;
  return userValues?.[condition.field] === condition.equals;
}

function shouldValidateField(field, userValues) {
  if (field.omitWhen && matchesCondition(field.omitWhen, userValues)) {
    return false;
  }

  return true;
}

/**
 * Validate all required fields are present and non-empty.
 */
export function validateRequiredFields(schema, userValues) {
  for (const field of schema.fields) {
    if (!shouldValidateField(field, userValues)) continue;
    if (!field.required) continue;
    const value = userValues[field.key];
    if (value === undefined || value === null || value === "") {
      throw new AppError(`Missing required field: ${field.label} (${field.tfPath})`);
    }
  }
}

/**
 * Validate enum/min/max constraints.
 */
export function validateConstraints(schema, userValues) {
  for (const field of schema.fields) {
    if (!shouldValidateField(field, userValues)) continue;
    const value = userValues[field.key];
    if (value === undefined || value === null || value === "") continue;

    const enumValues = field.validation?.enum || field.enumValues;

    if (enumValues && !enumValues.includes(value)) {
      throw new AppError(
        `Invalid value "${value}" for ${field.label}. Allowed: ${enumValues.join(", ")}`
      );
    }

    if (field.validation?.min !== undefined && Number(value) < field.validation.min) {
      throw new AppError(`${field.label} must be at least ${field.validation.min}`);
    }

    if (field.validation?.max !== undefined && Number(value) > field.validation.max) {
      throw new AppError(`${field.label} must be at most ${field.validation.max}`);
    }
  }
}
