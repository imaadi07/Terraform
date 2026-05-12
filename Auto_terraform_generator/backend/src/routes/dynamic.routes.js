import express from "express";

import {
  getInstanceTypes,
  getKeyPairs,
  getVpcs,
  getSubnets,
  getSecurityGroups,
  getAmis,
  getAvailabilityZones,
} from "../providers/aws/ec2.provider.js";
import { getNamespaces } from "../providers/aws/redshift-serverless.provider.js";

const router = express.Router();

router.get("/aws/ec2/availability-zones", async (_req, res, next) => {
  try {
    const data = await getAvailabilityZones();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

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
    const data = await getSubnets(_req.query.vpcId);

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
    const data = await getSecurityGroups(_req.query.vpcId);

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

router.get("/aws/vpcs", async (_req, res, next) => {
  try {
    const data = await getVpcs();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/subnets", async (req, res, next) => {
  try {
    const data = await getSubnets(req.query.vpcId);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/security-groups", async (req, res, next) => {
  try {
    const data = await getSecurityGroups(req.query.vpcId);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/redshift/namespaces", async (_req, res, next) => {
  try {
    const data = await getNamespaces();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
