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
import {
  getZones,
  getRegions,
  getMachineTypes,
  getImages,
  getNetworks,
  getSubnetworks,
} from "../providers/gcp/compute.provider.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// AWS routes
// ─────────────────────────────────────────────────────────────────────────────

router.get("/aws/ec2/availability-zones", async (_req, res, next) => {
  try {
    const data = await getAvailabilityZones();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/ec2/instance-types", async (_req, res, next) => {
  try {
    const data = await getInstanceTypes();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/ec2/keypairs", async (_req, res, next) => {
  try {
    const data = await getKeyPairs();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/ec2/subnets", async (_req, res, next) => {
  try {
    const data = await getSubnets(_req.query.vpcId);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/ec2/security-groups", async (_req, res, next) => {
  try {
    const data = await getSecurityGroups(_req.query.vpcId);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/ec2/amis", async (_req, res, next) => {
  try {
    const data = await getAmis();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/vpcs", async (_req, res, next) => {
  try {
    const data = await getVpcs();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/subnets", async (req, res, next) => {
  try {
    const data = await getSubnets(req.query.vpcId);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/security-groups", async (req, res, next) => {
  try {
    const data = await getSecurityGroups(req.query.vpcId);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/aws/redshift/namespaces", async (_req, res, next) => {
  try {
    const data = await getNamespaces();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GCP routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/dynamic/gcp/regions
 * Lists all available GCP regions for the configured project.
 */
router.get("/gcp/regions", async (_req, res, next) => {
  try {
    const data = await getRegions();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dynamic/gcp/compute/zones
 * Lists all available GCP zones.
 */
router.get("/gcp/compute/zones", async (_req, res, next) => {
  try {
    const data = await getZones();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dynamic/gcp/compute/machine-types?zone=us-central1-a
 * Lists machine types. Defaults to us-central1-a if no zone is provided.
 */
router.get("/gcp/compute/machine-types", async (req, res, next) => {
  try {
    const data = await getMachineTypes(req.query.zone);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dynamic/gcp/compute/images
 * Lists public OS images from common GCP image projects.
 */
router.get("/gcp/compute/images", async (_req, res, next) => {
  try {
    const data = await getImages();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dynamic/gcp/compute/networks
 * Lists VPC networks in the project.
 */
router.get("/gcp/compute/networks", async (_req, res, next) => {
  try {
    const data = await getNetworks();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dynamic/gcp/compute/subnetworks?region=us-central1
 * GET /api/dynamic/gcp/compute/subnetworks?zone=us-central1-a
 * Lists subnetworks. Pass ?region= or ?zone= to filter.
 */
router.get("/gcp/compute/subnetworks", async (req, res, next) => {
  try {
    const data = await getSubnetworks(req.query.zone || req.query.region);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
