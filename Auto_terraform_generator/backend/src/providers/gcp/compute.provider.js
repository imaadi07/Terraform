/**
 * GCP Compute provider — fetches dynamic option lists from the
 * Google Cloud REST API using Application Default Credentials (ADC)
 * or the GOOGLE_APPLICATION_CREDENTIALS env variable.
 *
 * Prerequisites:
 *   npm install googleapis
 *   Set env var: GOOGLE_CLOUD_PROJECT=<your-project-id>
 *   Authenticate: gcloud auth application-default login
 *                 OR set GOOGLE_APPLICATION_CREDENTIALS to a service-account key file.
 */

import { google } from "googleapis";

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT;

/**
 * Returns an authenticated Google API auth client.
 * Uses ADC (Application Default Credentials) automatically.
 */
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  return auth.getClient();
}

/**
 * GET /api/dynamic/gcp/compute/zones
 * Returns all available GCP zones for the project.
 */
export async function getZones() {
  const auth = await getAuthClient();
  const compute = google.compute({ version: "v1", auth });

  const response = await compute.zones.list({ project: PROJECT });
  const zones = response.data.items || [];

  return zones
    .filter((z) => z.status === "UP")
    .map((z) => ({ label: z.name, value: z.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * GET /api/dynamic/gcp/regions
 * Returns all available GCP regions for the project.
 */
export async function getRegions() {
  const auth = await getAuthClient();
  const compute = google.compute({ version: "v1", auth });

  const response = await compute.regions.list({ project: PROJECT });
  const regions = response.data.items || [];

  return regions
    .filter((r) => r.status === "UP")
    .map((r) => ({ label: r.name, value: r.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * GET /api/dynamic/gcp/compute/machine-types
 * Returns machine types for a given zone (defaults to us-central1-a).
 */
export async function getMachineTypes(zone = "us-central1-a") {
  const auth = await getAuthClient();
  const compute = google.compute({ version: "v1", auth });

  const response = await compute.machineTypes.list({ project: PROJECT, zone });
  const types = response.data.items || [];

  return types
    .map((t) => ({ label: `${t.name} (${t.description})`, value: t.name }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

/**
 * GET /api/dynamic/gcp/compute/images
 * Returns popular public images from well-known GCP image projects.
 */
export async function getImages() {
  const auth = await getAuthClient();
  const compute = google.compute({ version: "v1", auth });

  // Fetch images from common public image families.
  const imageProjects = [
    "debian-cloud",
    "ubuntu-os-cloud",
    "centos-cloud",
    "rhel-cloud",
    "windows-cloud",
  ];

  const results = [];

  for (const imageProject of imageProjects) {
    try {
      const response = await compute.images.list({
        project: imageProject,
        filter: "deprecated.replacement=null", // only non-deprecated images
        maxResults: 10,
        orderBy: "creationTimestamp desc",
      });

      const images = response.data.items || [];
      results.push(
        ...images.map((img) => ({
          label: `${img.name} (${imageProject})`,
          value: `${imageProject}/${img.family || img.name}`,
        }))
      );
    } catch {
      // Skip projects where we lack permission — continue gracefully.
    }
  }

  return results;
}

/**
 * GET /api/dynamic/gcp/compute/networks
 * Returns VPC networks in the project.
 */
export async function getNetworks() {
  const auth = await getAuthClient();
  const compute = google.compute({ version: "v1", auth });

  const response = await compute.networks.list({ project: PROJECT });
  const networks = response.data.items || [];

  return networks.map((n) => ({
    label: n.name,
    value: n.selfLink,
  }));
}

/**
 * GET /api/dynamic/gcp/compute/subnetworks
 * Returns subnetworks, optionally filtered by region.
 */
export async function getSubnetworks(region) {
  const auth = await getAuthClient();
  const compute = google.compute({ version: "v1", auth });

  let subnets = [];

  if (region) {
    const response = await compute.subnetworks.list({ project: PROJECT, region });
    subnets = response.data.items || [];
  } else {
    // Aggregate across all regions.
    const response = await compute.subnetworks.aggregatedList({ project: PROJECT });
    const items = response.data.items || {};
    for (const regionData of Object.values(items)) {
      if (regionData.subnetworks) subnets.push(...regionData.subnetworks);
    }
  }

  return subnets.map((s) => ({
    label: `${s.name} (${s.region?.split("/").pop()})`,
    value: s.selfLink,
  }));
}
