/**
 * Serialize a nested JS object to HCL string.
 * indent: current indentation level (number of 2-space units).
 */
export function serializeToHcl(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  let out = "";

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    // Boolean / number / string → assignment
    if (typeof value === "boolean") {
      out += `${pad}${key} = ${value}\n`;
      continue;
    }

    if (typeof value === "number") {
      out += `${pad}${key} = ${value}\n`;
      continue;
    }

    if (typeof value === "string") {
      out += `${pad}${key} = ${formatString(value)}\n`;
      continue;
    }

    // List of primitives → assignment with brackets
    if (Array.isArray(value)) {
      const items = value.map(formatString).join(", ");
      out += `${pad}${key} = [${items}]\n`;
      continue;
    }

    // Plain object — check if it's a map (tags) or a block (root_block_device)
    if (typeof value === "object") {
      // Heuristic: if all values are primitives it's a map assignment, not a block
      const allPrimitive = Object.values(value).every(
        (v) => typeof v === "string" || typeof v === "number" || typeof v === "boolean"
      );

      if (allPrimitive && key === "tags") {
        // tags = { Key = "Value" }
        out += `${pad}${key} = {\n`;
        for (const [k, v] of Object.entries(value)) {
          out += `${pad}  ${k} = ${formatString(v)}\n`;
        }
        out += `${pad}}\n`;
      } else {
        // nested block — no equals sign
        out += `${pad}${key} {\n`;
        out += serializeToHcl(value, indent + 1);
        out += `${pad}}\n`;
      }
      continue;
    }
  }

  return out;
}

function formatString(value) {
  if (typeof value === "boolean") return value.toString();
  if (typeof value === "number") return value.toString();
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}
