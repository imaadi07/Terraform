import { getSchemaById } from "./schema-loader.service.js";
import {
  getAvailabilityZones,
  getSubnets,
  getSecurityGroups,
  getVpcs,
} from "../providers/aws/ec2.provider.js";
import { getNamespaces } from "../providers/aws/redshift-serverless.provider.js";
import {
  getNetworks,
  getSubnetworks,
} from "../providers/gcp/compute.provider.js";

const RESOURCE_LOADERS = {
  "/api/dynamic/aws/ec2/subnets": ({ vpcId } = {}) => getSubnets(vpcId),
  "/api/dynamic/aws/subnets": ({ vpcId } = {}) => getSubnets(vpcId),
  "/api/dynamic/aws/ec2/security-groups": ({ vpcId } = {}) =>
    getSecurityGroups(vpcId),
  "/api/dynamic/aws/security-groups": ({ vpcId } = {}) =>
    getSecurityGroups(vpcId),
  "/api/dynamic/aws/vpcs": () => getVpcs(),
  "/api/dynamic/aws/redshift/namespaces": () => getNamespaces(),
  "/api/dynamic/aws/ec2/availability-zones": () => getAvailabilityZones(),
  "/api/dynamic/gcp/compute/networks": () => getNetworks(),
  "/api/dynamic/gcp/compute/subnetworks": ({ region, zone } = {}) =>
    getSubnetworks(zone || region),
};

function getExistingSource(dep, parentSchema) {
  if (dep.existingResourceDataSource) return dep.existingResourceDataSource;
  if (dep.existingDataSource) return dep.existingDataSource;

  const linkedField = (parentSchema.fields || []).find(
    (field) => field.key === dep.linkField,
  );

  return linkedField?.dataSource || linkedField?.dynamicSource || null;
}

function buildParams(source, context) {
  if (!source?.queryParam) return {};

  const contextKey = source.dependsOn || source.queryParam;
  const value = context?.[contextKey];

  return value ? { [source.queryParam]: value } : {};
}

function chooseDefaultOption(options) {
  if (!options.length) return null;

  const defaultMatch = options.find((option) => {
    const label = String(option.label || "").toLowerCase();
    const value = String(option.value || "").toLowerCase();
    return option.default === true || label.includes("default") || value.includes("default");
  });

  return defaultMatch || options[0];
}

export class InfrastructureDependencyResolverService {
  async resolve(primarySchema, context = {}) {
    const dependencies = await this._resolveForSchema(primarySchema, context);

    return {
      resourceType: primarySchema.canvasType,
      terraformType: primarySchema.terraformType,
      dependencies,
      summary: this._summarize(dependencies),
    };
  }

  async _resolveForSchema(schema, context, visited = new Set()) {
    const output = {};

    for (const dep of schema.dependencies || []) {
      if (visited.has(dep.resourceType)) continue;
      visited.add(dep.resourceType);

      const depSchema = getSchemaById(dep.resourceType);

      if (!depSchema) {
        output[dep.resourceType] = {
          status: "missing",
          requiresCreation: true,
          reason: `Dependency schema not found for ${dep.resourceType}`,
          dependency: dep,
        };
        continue;
      }

      const source = getExistingSource(dep, schema);
      const loader = source?.endpoint ? RESOURCE_LOADERS[source.endpoint] : null;
      const params = buildParams(source, context);

      let options = [];
      let error = null;

      if (loader) {
        try {
          options = await loader(params);
        } catch (err) {
          error = err.message || "Unable to query cloud resources";
        }
      }

      const selected = chooseDefaultOption(options);

      if (selected) {
        output[dep.resourceType] = {
          status: "resolved",
          mode: "existing",
          requiresCreation: false,
          selected,
          options,
          linkField: dep.linkField,
          source: source || null,
          dependency: dep,
        };
        continue;
      }

      const childContext = {
        ...context,
        ...(dep.resolutionContext || {}),
      };

      output[dep.resourceType] = {
        status: "missing",
        mode: dep.resolutionStrategy?.ifMissing || "inline-create",
        requiresCreation: true,
        selected: null,
        options,
        linkField: dep.linkField,
        source: source || null,
        dependency: dep,
        reason:
          error ||
          (loader
            ? `No existing ${dep.displayName || dep.resourceType} resources were found.`
            : `No existing-resource loader is configured for ${dep.displayName || dep.resourceType}.`),
        dependencies: await this._resolveForSchema(depSchema, childContext, visited),
      };
    }

    return output;
  }

  _summarize(dependencies) {
    const summary = {
      resolved: 0,
      missing: 0,
    };

    const visit = (items) => {
      for (const item of Object.values(items || {})) {
        if (item.status === "resolved") summary.resolved += 1;
        if (item.status === "missing") summary.missing += 1;
        visit(item.dependencies);
      }
    };

    visit(dependencies);
    return summary;
  }
}
