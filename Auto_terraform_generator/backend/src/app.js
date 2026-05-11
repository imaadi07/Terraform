import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import terraformRoutes from "./routes/terraform.routes.js";
import dynamicRoutes from "./routes/dynamic.routes.js";

dotenv.config();

const app = express();

app.use(cors());

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use("/api/terraform", terraformRoutes);
app.use("/api/dynamic", dynamicRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);

  return res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});