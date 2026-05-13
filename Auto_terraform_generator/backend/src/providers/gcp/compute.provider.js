/**
 * File:
 * backend/src/providers/gcp/compute.provider.js
 *
 * GCP Compute provider — dynamic option providers
 * for GCP VM infrastructure resources.
 */

import { google } from "googleapis";

/**
 * Read project dynamically from env.
 */
function getProject() {
  return process.env.GOOGLE_CLOUD_PROJECT;
}

/**
 * Auth client using ADC.
 */
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  return auth.getClient();
}

/**
 * GET /api/dynamic/gcp/compute/zones
 */
export async function getZones() {
  const auth = await getAuthClient();

  const compute = google.compute({
    version: "v1",
    auth,
  });

  try {
    const response = await compute.zones.list({
      project: getProject(),
    });

    const zones = response.data.items || [];

    return zones
      .filter((z) => z.status === "UP")
      .map((z) => ({
        label: z.name,
        value: z.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (error) {
    console.error("Failed to fetch zones:", error.message);
    return [];
  }
}

/**
 * GET /api/dynamic/gcp/compute/regions
 */
export async function getRegions() {
  const auth = await getAuthClient();

  const compute = google.compute({
    version: "v1",
    auth,
  });

  try {
    const response = await compute.regions.list({
      project: getProject(),
    });

    const regions = response.data.items || [];

    return regions
      .filter((r) => r.status === "UP")
      .map((r) => ({
        label: r.name,
        value: r.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (error) {
    console.error("Failed to fetch regions:", error.message);
    return [];
  }
}

/**
 * GET /api/dynamic/gcp/compute/machine-types
 *
 * Accepts zone.
 */
export async function getMachineTypes(zone = "us-central1-a") {
  const auth = await getAuthClient();

  const compute = google.compute({
    version: "v1",
    auth,
  });

  try {
    const response = await compute.machineTypes.list({
      project: getProject(),
      zone,
    });

    const types = response.data.items || [];

    return types
      .map((t) => ({
        label: `${t.name} (${t.guestCpus} vCPU, ${Math.round(
          t.memoryMb / 1024,
        )} GB RAM)`,
        value: t.name,
      }))
      .sort((a, b) => a.value.localeCompare(b.value));
  } catch (error) {
    console.error("Failed to fetch machine types:", error.message);
    return [];
  }
}

/**
 * GET /api/dynamic/gcp/compute/images
 */
export async function getImages() {
  const auth = await getAuthClient();

  const compute = google.compute({
    version: "v1",
    auth,
  });

  const imageProjects = [
    "ubuntu-os-cloud",
    "debian-cloud",
    "centos-cloud",
    "rhel-cloud",
    "windows-cloud",
  ];

  const results = [];

  for (const imageProject of imageProjects) {
    try {
      const response = await compute.images.list({
        project: imageProject,
        maxResults: 15,
      });

      const images = response.data.items || [];

      results.push(
        ...images.map((img) => ({
          label: `${img.name} (${imageProject})`,
          value: `${imageProject}/${img.family || img.name}`,
        })),
      );
    } catch (error) {
      console.error(
        `Unable to fetch images from ${imageProject}:`,
        error.message,
      );
    }
  }

  return results.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * GET /api/dynamic/gcp/compute/networks
 */
export async function getNetworks() {
  const auth = await getAuthClient();

  const compute = google.compute({
    version: "v1",
    auth,
  });

  try {
    const response = await compute.networks.list({
      project: getProject(),
    });

    const networks = response.data.items || [];

    return networks.map((n) => ({
      label: n.name,
      value: n.selfLink,
    }));
  } catch (error) {
    console.error("Failed to fetch networks:", error.message);
    return [];
  }
}

/**
 * GET /api/dynamic/gcp/compute/subnetworks
 *
 * Accepts zone and derives region automatically.
 *
 * Example:
 * us-central1-a -> us-central1
 */
export async function getSubnetworks(zone) {
  const auth = await getAuthClient();

  const compute = google.compute({
    version: "v1",
    auth,
  });

  let subnets = [];

  // Convert zone -> region
  let region = null;

  if (zone) {
    const parts = zone.split("-");

    if (parts.length >= 2) {
      region = `${parts[0]}-${parts[1]}`;
    }
  }

  try {
    if (region) {
      const response = await compute.subnetworks.list({
        project: getProject(),
        region,
      });

      subnets = response.data.items || [];
    } else {
      const response = await compute.subnetworks.aggregatedList({
        project: getProject(),
      });

      const items = response.data.items || {};

      for (const regionData of Object.values(items)) {
        if (regionData.subnetworks) {
          subnets.push(...regionData.subnetworks);
        }
      }
    }

    return subnets.map((s) => ({
      label: `${s.name} (${s.region?.split("/").pop()})`,
      value: s.selfLink,
    }));
  } catch (error) {
    console.error("Failed to fetch subnetworks:", error.message);
    return [];
  }
}
