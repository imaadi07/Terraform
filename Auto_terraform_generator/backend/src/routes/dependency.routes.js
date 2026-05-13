import express from "express";

import { getSchemaById } from "../services/schema-loader.service.js";
import { InfrastructureDependencyResolverService } from "../services/infrastructure-dependency-resolver.service.js";

const router = express.Router();
const resolverService = new InfrastructureDependencyResolverService();

router.post("/resolve/:resourceId", async (req, res, next) => {
  try {
    const schema = getSchemaById(req.params.resourceId);

    if (!schema) {
      return res.status(404).json({
        success: false,
        error: `Schema not found for resourceId: "${req.params.resourceId}"`,
      });
    }

    const result = await resolverService.resolve(schema, req.body?.context || {});

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
