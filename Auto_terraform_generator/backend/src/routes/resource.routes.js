import express from "express";
import { getAllSchemas } from "../services/schema-loader.service.js";

const router = express.Router();

router.get("/", (_req, res) => {
  const resources = getAllSchemas();

  return res.json({
    success: true,
    data: resources,
  });
});

export default router;