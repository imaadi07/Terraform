import express from "express";

import {
  getInstanceTypes,
  getKeyPairs,
  getSubnets,
  getSecurityGroups,
  getAmis,
} from "../providers/aws/ec2.provider.js";

const router = express.Router();

router.get("/aws/ec2/instance-types", async (_req, res, next) => {
  try {
    const data = await getInstanceTypes();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/ec2/keypairs", async (_req, res, next) => {
  try {
    const data = await getKeyPairs();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/ec2/subnets", async (_req, res, next) => {
  try {
    const data = await getSubnets();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/ec2/security-groups", async (_req, res, next) => {
  try {
    const data = await getSecurityGroups();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/ec2/amis", async (_req, res, next) => {
  try {
    const data = await getAmis();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

export default router;