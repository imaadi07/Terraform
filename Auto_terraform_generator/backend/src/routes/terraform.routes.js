import express from "express";

import { TerraformGeneratorService } from "../services/terraform-generator.services.js";
import { DependencyResolverService } from "../services/dependency-resolver.service.js";
import { getSchemaById } from "../services/schema-loader.service.js";

const router = express.Router();

const generatorService = new TerraformGeneratorService();
const resolverService = new DependencyResolverService();

/**
 * POST /api/terraform/multi/:resourceId
 * Multi-resource generation with inline dependency support.
 *
 * IMPORTANT: This route is declared BEFORE /:resourceId so Express does not
 * swallow the literal "multi" segment as a resourceId param.
 *
 * Expected request body:
 * {
 *   "primary": { ...primaryFieldValues },
 *   "dependencies": {
 *     "aws-subnet": {
 *       "mode": "inline-create",          // "existing" | "inline-create"
 *       "values": { ...subnetFieldValues }
 *     },
 *     "aws-vpc": {
 *       "mode": "inline-create",
 *       "values": { ...vpcFieldValues }
 *     }
 *   }
 * }
 *
 * Each dependency entry has:
 *   mode   — resolution strategy chosen by the user in the UI
 *   values — field values for that dependency resource
 *
 * For backward-compat the old flat-object shape { "aws-redshiftserverless-namespace": { fieldKey: val } }
 * is also accepted and treated as mode="inline-create".
 */
router.post("/multi/:resourceId", (req, res, next) => {
  try {
    const schema = getSchemaById(req.params.resourceId);

    if (!schema) {
      return res.status(404).json({
        success: false,
        error: `Schema not found for resourceId: "${req.params.resourceId}"`,
      });
    }

    const { primary = {}, dependencies = {} } = req.body;

    // Normalise dependency payload to always be { resourceType: { mode, values } }.
    // Old format was { resourceType: { fieldKey: val } } (flat field map).
    // New format is   { resourceType: { mode: "...", values: { fieldKey: val } } }.
    const normalisedDeps = {};
    for (const [resourceType, entry] of Object.entries(dependencies)) {
      if (entry && typeof entry === "object" && ("mode" in entry || "values" in entry)) {
        // Already in new format
        normalisedDeps[resourceType] = {
          mode: entry.mode || "inline-create",
          values: entry.values || {},
        };
      } else {
        // Legacy flat format — treat as inline-create with the object as values
        normalisedDeps[resourceType] = {
          mode: "inline-create",
          values: entry || {},
        };
      }
    }

    // Resolve declared deps — validates their fields and builds tfRefs.
    const resolvedDeps = resolverService.resolve(schema, normalisedDeps);
    const refMap = resolverService.buildRefMap(resolvedDeps);

    const terraform = generatorService.generateMulti(
      schema,
      primary,
      resolvedDeps,
      refMap
    );

    generatorService.saveTerraformFile(terraform);

    return res.json({
      success: true,
      terraform,
      resolvedDependencies: resolvedDeps.map((d) => ({
        resourceType: d.resourceType,
        terraformType: d.terraformType,
        resourceName: d.resourceName,
        tfRef: d.tfRef,
        mode: d.mode,
        isDataSource: d.isDataSource,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/terraform/:resourceId
 * Original single-resource generation endpoint — unchanged behaviour.
 */
router.post("/:resourceId", (req, res, next) => {
  try {
    const schema = getSchemaById(req.params.resourceId);

    if (!schema) {
      return res.status(404).json({
        success: false,
        error: `Schema not found for resourceId: "${req.params.resourceId}"`,
      });
    }

    const terraform = generatorService.generate(schema, req.body);
    generatorService.saveTerraformFile(terraform);

    return res.json({ success: true, terraform });
  } catch (error) {
    next(error);
  }
});

export default router;
