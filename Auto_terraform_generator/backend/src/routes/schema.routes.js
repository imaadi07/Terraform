import express from "express";

import { getSchemaById } from "../services/schema-loader.service.js";

const router = express.Router();

router.get("/:resourceId", (req, res) => {
  const schema = getSchemaById(req.params.resourceId);

  if (!schema) {
    return res.status(404).json({
      success: false,
      error: "Schema not found",
    });
  }

  return res.json({
    success: true,
    data: schema,
  });
});

export default router;