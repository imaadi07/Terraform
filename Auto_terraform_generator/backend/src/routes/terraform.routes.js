import express from "express";
import fs from "fs";
import path from "path";

import { TerraformGeneratorService } from "../services/terraform-generator.services.js";

const router = express.Router();
const generatorService = new TerraformGeneratorService();

let cachedSchema = null;

function getSchema() {
  if (!cachedSchema) {
    const schemaPath = path.join(process.cwd(), "src/schemas/aws-ec2.base.json");
    cachedSchema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  }
  return cachedSchema;
}

// GET /api/terraform/schema — returns the UI manifest for the frontend to render
router.get("/schema", (_req, res) => {
  return res.json(getSchema());
});

// POST /api/terraform/generate — accepts { key: value } user inputs, returns HCL string
router.post("/generate", (req, res, next) => {
  try {
    const schema = getSchema();
    const terraform = generatorService.generate(schema, req.body);
    generatorService.saveTerraformFile(terraform);

    return res.json({ success: true, terraform });
  } catch (error) {
    next(error);
  }
});

export default router;
