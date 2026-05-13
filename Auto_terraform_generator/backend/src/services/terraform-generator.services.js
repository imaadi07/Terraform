import fs from "fs";
import path from "path";

import { inferFieldType, coerceValue, validateRequiredFields, validateConstraints } from "./validation.service.js";
import { serializeToHcl } from "./serializer.service.js";
import { sanitizeTerraformName } from "../utils/naming.util.js";

// Provider header configurations keyed by providerKey.
const PROVIDER_HEADERS = {
  aws: [
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
  ],
  gcp: [
    `terraform {`,
    `  required_providers {`,
    `    google = {`,
    `      source  = "hashicorp/google"`,
    `      version = "~> 5.0"`,
    `    }`,
    `  }`,
    `}`,
    ``,
    `provider "google" {`,
    `  project = var.gcp_project_id`,
    `  region  = "us-central1"`,
    `}`,
    ``,
    `variable "gcp_project_id" {`,
    `  description = "The GCP project ID to deploy resources into."`,
    `  type        = string`,
    `}`,
    ``,
  ],
};

export class TerraformGeneratorService {
  /**
   * Build a Terraform config object from schema + user values.
   * refMap: optional { fieldKey → tfRef string } — when a field's key
   * appears in refMap its value is emitted as a raw Terraform reference
   * (no quotes) instead of the user-typed literal.
   */
  _buildConfig(schema, userValues, refMap = {}) {
    const tfConfig = {};

    for (const field of schema.fields) {
      if (field.uiOnly || !field.tfPath) continue;

      // If this field is satisfied by a Terraform reference, store it
      // under a special marker so the serializer can emit it unquoted.
      if (refMap[field.key]) {
        const parts = field.tfPath.split(".");
        this._setNested(tfConfig, parts, { __tfRef: refMap[field.key] });
        continue;
      }

      const type = inferFieldType(field);
      const raw = userValues[field.key];
      const rawValue =
        raw === undefined || raw === null || raw === ""
          ? field.default
          : raw;
      if (rawValue === undefined) continue;

      const coerced = coerceValue(rawValue, type);
      if (coerced === undefined) continue;

      const parts = field.tfPath.split(".");
      this._setNested(tfConfig, parts, coerced);
    }

    return tfConfig;
  }

  /** Write a nested value into obj using a parts array path. */
  _setNested(obj, parts, value) {
    let cursor = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!cursor[parts[i]]) cursor[parts[i]] = {};
      cursor = cursor[parts[i]];
    }

    cursor[parts[parts.length - 1]] = value;
  }

  /** Emit a data source block for an "existing" dependency. */
  _dataBlock(terraformType, resourceName, existingId) {
    const idLine = existingId
      ? `  id = "${existingId}"`
      : `  # id = var.${resourceName}_id  # supply the existing resource ID`;
    return [
      `data "${terraformType}" "${resourceName}" {`,
      idLine,
      `}`,
    ].join("\n");
  }

  /**
   * Serialize a single resource block to HCL lines.
   * Handles __tfRef markers — emits them without quotes so Terraform
   * can resolve the reference at plan time.
   */
  _resourceBlock(terraformType, resourceName, tfConfig) {
    const lines = [];
    lines.push(`resource "${terraformType}" "${resourceName}" {`);
    lines.push(this._serializeWithRefs(tfConfig, 1).trimEnd());
    lines.push(`}`);
    return lines.join("\n");
  }

  /** Like serializeToHcl but handles { __tfRef } objects as raw refs. */
  _serializeWithRefs(obj, indent) {
    const pad = "  ".repeat(indent);
    let out = "";

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;

      // Raw Terraform reference — emit without quotes.
      if (value && typeof value === "object" && value.__tfRef) {
        out += `${pad}${key} = ${value.__tfRef}\n`;
        continue;
      }

      // Delegate everything else to the standard serializer.
      out += serializeToHcl({ [key]: value }, indent)
        .split("\n")
        .join("\n");
    }

    return out;
  }

  /**
   * Generate Terraform HCL for a single resource (original behaviour).
   */
  generate(schema, userValues) {
    validateRequiredFields(schema, userValues);
    validateConstraints(schema, userValues);

    const tfConfig = this._buildConfig(schema, userValues);
    const resourceName = sanitizeTerraformName(`${schema.canvasType}_resource`);

    return this._buildFile(
      [this._resourceBlock(schema.terraformType, resourceName, tfConfig)],
      schema.providerKey
    );
  }

  /**
   * Generate Terraform HCL for a primary resource plus its resolved
   * dependencies.  Dependencies are emitted first so Terraform can
   * resolve references in the correct order.
   *
   * @param {object} primarySchema   — primary resource base.json
   * @param {object} primaryValues   — user values for the primary resource
   * @param {Array}  resolvedDeps    — output of DependencyResolverService.resolve()
   * @param {object} refMap          — output of DependencyResolverService.buildRefMap()
   */
  generateMulti(primarySchema, primaryValues, resolvedDeps, refMap) {
    validateRequiredFields(primarySchema, primaryValues);
    validateConstraints(primarySchema, primaryValues);

    const blocks = [];

    // 1. Emit dependency blocks first (leaves first due to resolver ordering).
    for (const dep of resolvedDeps) {
      if (dep.isDataSource) {
        // "existing" mode — emit a data source block so Terraform can look up
        // the resource by the user-supplied ID.
        blocks.push(this._dataBlock(dep.terraformType, dep.resourceName, dep.existingId));
      } else {
        // "inline-create" mode — emit a full resource block, injecting any
        // references resolved from this dep's own nested dependencies.
        const depConfig = this._buildConfig(dep.schema, dep.values, dep.nestedRefMap || {});
        blocks.push(this._resourceBlock(dep.terraformType, dep.resourceName, depConfig));
      }
    }

    // 2. Emit primary block with Terraform references injected.
    const primaryConfig = this._buildConfig(primarySchema, primaryValues, refMap);
    const primaryName = sanitizeTerraformName(`${primarySchema.canvasType}_resource`);
    blocks.push(
      this._resourceBlock(primarySchema.terraformType, primaryName, primaryConfig)
    );

    return this._buildFile(blocks, primarySchema.providerKey);
  }

  /**
   * Wrap resource blocks in the correct provider header.
   * Falls back to AWS if providerKey is unknown.
   *
   * @param {string[]} blocks      — HCL resource/data blocks
   * @param {string}   providerKey — "aws" | "gcp" (from schema.providerKey)
   */
  _buildFile(blocks, providerKey = "aws") {
    const header = PROVIDER_HEADERS[providerKey] || PROVIDER_HEADERS["aws"];
    return [
      ...header,
      ...blocks.map((b) => b + "\n"),
    ].join("\n");
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
