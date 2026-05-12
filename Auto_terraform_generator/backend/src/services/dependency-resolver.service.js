import { getSchemaById } from "./schema-loader.service.js";
import { sanitizeTerraformName } from "../utils/naming.util.js";
import {
  validateRequiredFields,
  validateConstraints,
} from "./validation.service.js";

/**
 * Recursively resolves the full dependency chain for a resource schema.
 *
 * Resolution object shape (one per dependency, ordered leaves-first):
 * {
 *   resourceType  : string   — canvasType of the dependency
 *   terraformType : string   — e.g. "aws_subnet"
 *   resourceName  : string   — sanitized Terraform label
 *   schema        : object   — full base.json schema
 *   values        : object   — user-supplied values (validated)
 *   linkField     : string   — field key in the PARENT schema that this dep satisfies
 *   tfRef         : string   — resolved Terraform reference string
 *   mode          : string   — "existing" | "inline-create"
 *   isDataSource  : boolean  — true when mode === "existing" (emits a data block)
 * }
 */
export class DependencyResolverService {
  /**
   * Resolve all dependencies for a primary schema, recursing into each
   * dependency's own dependencies before adding it to the list.
   * This guarantees leaf resources appear first in the returned array
   * so the Terraform generator can emit blocks in dependency order.
   *
   * @param {object} primarySchema   — the primary resource's base.json
   * @param {object} depsPayload     — map of resourceType → { values, mode }
   *                                   e.g. {
   *                                     "aws-subnet": {
   *                                       values: { cidrBlock: "10.0.1.0/24" },
   *                                       mode: "inline-create"
   *                                     }
   *                                   }
   * @param {Set}    [_visited]      — internal cycle guard (do not pass externally)
   * @returns {Array} resolved dependency objects ordered leaves-first
   */
  resolve(primarySchema, depsPayload = {}, _visited = new Set()) {
    const decls = primarySchema.dependencies;

    if (!decls || decls.length === 0) return [];

    const resolved = [];

    for (const decl of decls) {
      // ── Cycle guard ────────────────────────────────────────────────────────
      if (_visited.has(decl.resourceType)) continue;
      _visited.add(decl.resourceType);

      const depSchema = getSchemaById(decl.resourceType);

      if (!depSchema) {
        throw new Error(
          `Dependency schema not found for resourceType: "${decl.resourceType}". ` +
            `Make sure a base.json with canvasType="${decl.resourceType}" exists.`,
        );
      }

      // ── Determine resolution mode ──────────────────────────────────────────
      // Priority: explicit user choice → schema default → "inline-create"
      const depPayload = depsPayload[decl.resourceType] || {};
      const mode =
        depPayload.mode ||
        decl.resolutionStrategy?.defaultMode ||
        "inline-create";

      const userValues = depPayload.values || {};

      // ── Existing mode: user supplies an ID, we emit a data source ──────────
      if (mode === "existing") {
        const existingId = userValues[decl.linkField] || userValues["id"] || "";
        const resourceName = sanitizeTerraformName(
          existingId || decl.resourceType,
        );
        const tfRef = (
          decl.existingTfOutputRef ||
          `data.${decl.terraformType}.{resourceName}.id`
        ).replace("{resourceName}", resourceName);

        resolved.push({
          resourceType: decl.resourceType,
          terraformType: decl.terraformType || depSchema.terraformType,
          resourceName,
          schema: depSchema,
          values: userValues,
          linkField: decl.linkField,
          tfRef,
          mode: "existing",
          isDataSource: true,
          existingId,
        });

        // Do NOT recurse into the dep's own deps when using existing mode —
        // the resource already exists in AWS, its upstream deps are irrelevant.
        continue;
      }

      // ── Inline-create mode: validate + recurse into the dep's own deps ─────
      validateRequiredFields(depSchema, userValues);
      validateConstraints(depSchema, userValues);

      // Recurse first — dep's dependencies must come before the dep itself.
      const nestedResolved = this.resolve(depSchema, depsPayload, _visited);
      resolved.push(...nestedResolved);

      // Build the nested refMap so the dep's own tfConfig gets references injected.
      const nestedRefMap = this.buildRefMap(nestedResolved);

      // Derive a stable Terraform resource label from the linkField value.
      const linkValue = userValues[decl.linkField] || decl.resourceType;
      const resourceName = sanitizeTerraformName(linkValue);

      const tfRef = decl.tfOutputRef.replace("{resourceName}", resourceName);

      resolved.push({
        resourceType: decl.resourceType,
        terraformType: decl.terraformType || depSchema.terraformType,
        resourceName,
        schema: depSchema,
        values: userValues,
        linkField: decl.linkField,
        tfRef,
        mode: "inline-create",
        isDataSource: false,
        nestedRefMap,
      });
    }

    return resolved;
  }

  /**
   * Build a map of { linkField → tfRef } for use by the generator
   * when injecting references into a resource's HCL config.
   *
   * @param {Array} resolved — output of resolve()
   * @returns {object}  e.g. { subnetId: "aws_subnet.my_subnet.id" }
   */
  buildRefMap(resolved) {
    const map = {};

    for (const dep of resolved) {
      map[dep.linkField] = dep.tfRef;
    }

    return map;
  }
}
