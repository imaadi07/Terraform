import fs from "fs";
import path from "path";

const schemaCache = new Map();

const SCHEMA_DIR = path.join(process.cwd(), "src/schemas");

export function getAllSchemas() {
  const files = fs.readdirSync(SCHEMA_DIR);

  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const fullPath = path.join(SCHEMA_DIR, file);

      const schema = JSON.parse(
        fs.readFileSync(fullPath, "utf-8")
      );

      return {
        id: schema.canvasType,
        terraformType: schema.terraformType,
        displayName: schema.displayName,
        provider: schema.providerKey,
        file,
      };
    });
}

export function getSchemaById(resourceId) {
  if (schemaCache.has(resourceId)) {
    return schemaCache.get(resourceId);
  }

  const files = fs.readdirSync(SCHEMA_DIR);

  for (const file of files) {
    const fullPath = path.join(SCHEMA_DIR, file);

    const schema = JSON.parse(
      fs.readFileSync(fullPath, "utf-8")
    );

    if (schema.canvasType === resourceId) {
      schemaCache.set(resourceId, schema);
      return schema;
    }
  }

  return null;
}