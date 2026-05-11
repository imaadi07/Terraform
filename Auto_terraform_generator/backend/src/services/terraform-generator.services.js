import fs from "fs";
import path from "path";

import { inferFieldType, coerceValue, validateRequiredFields, validateConstraints } from "./validation.service.js";
import { serializeToHcl } from "./serializer.service.js";
import { sanitizeTerraformName } from "../utils/naming.util.js";

export class TerraformGeneratorService {
  /**
   * Build a terraform config object from the UI manifest schema + raw user values.
   * Handles dot-notation tfPaths like "root_block_device.volume_size" automatically.
   */
  generate(schema, userValues) {
    validateRequiredFields(schema, userValues);
    validateConstraints(schema, userValues);

    const tfConfig = {};

    for (const field of schema.fields) {
      const type = inferFieldType(field);
      const raw = userValues[field.key];

      // Use default if user provided nothing
      const rawValue = (raw === undefined || raw === null || raw === "") ? field.default : raw;
      if (rawValue === undefined) continue;

      const coerced = coerceValue(rawValue, type);
      if (coerced === undefined) continue;

      // Handle dot-notation tfPath: "root_block_device.volume_size"
      const parts = field.tfPath.split(".");
      if (parts.length === 1) {
        tfConfig[parts[0]] = coerced;
      } else {
        // Nested — build the intermediate object
        let cursor = tfConfig;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!cursor[parts[i]]) cursor[parts[i]] = {};
          cursor = cursor[parts[i]];
        }
        cursor[parts[parts.length - 1]] = coerced;
      }
    }

    const resourceName = sanitizeTerraformName(`${schema.canvasType}_resource`);

    const hcl = [
      `terraform {`,
      `  required_providers {`,
      `    aws = {`,
      `      source  = "hashicorp/aws"`,
      `      version = "~> 5.0"`,
      `    }`,
      `  }`,
      `}`,
      ``,
      `provider "aws" {`,
      `  region = "us-east-1"`,
      `}`,
      ``,
      `resource "${schema.terraformType}" "${resourceName}" {`,
      serializeToHcl(tfConfig, 1).trimEnd(),
      `}`,
      ``,
    ].join("\n");

    return hcl;
  }

  saveTerraformFile(content) {
    const outputDirectory = path.join(process.cwd(), "generated");

    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const outputPath = path.join(outputDirectory, "main.tf");
    fs.writeFileSync(outputPath, content, { encoding: "utf-8", flag: "w" });
    return outputPath;
  }
}
