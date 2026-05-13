import fs from "fs";
import path from "path";

const schemaCache = new Map();

const SCHEMA_DIR = path.join(process.cwd(), "src/schemas");

/**
 * Recursively collect all .json file paths under a directory,
 * skipping any folder named "_deprecated".
 */
function collectJsonFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "_deprecated") continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}

export function getAllSchemas() {
  const files = collectJsonFiles(SCHEMA_DIR);

  return files
    .map((fullPath) => {
      const schema = JSON.parse(fs.readFileSync(fullPath, "utf-8"));

      // Skip files that don't follow the standard schema format.
      if (!schema.canvasType) return null;

      return {
        id: schema.canvasType,
        terraformType: schema.terraformType,
        displayName: schema.displayName,
        provider: schema.providerKey,
        file: path.relative(SCHEMA_DIR, fullPath),
      };
    })
    .filter(Boolean);
}

export function getSchemaById(resourceId) {
  if (schemaCache.has(resourceId)) {
    return schemaCache.get(resourceId);
  }

  const files = collectJsonFiles(SCHEMA_DIR);

  for (const fullPath of files) {
    const schema = JSON.parse(fs.readFileSync(fullPath, "utf-8"));

    if (!schema.canvasType) continue;

    if (schema.canvasType === resourceId) {
      schemaCache.set(resourceId, schema);
      return schema;
    }
  }

  return null;
}
