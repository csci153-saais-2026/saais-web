const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { withPinnedContract } = require("./snapshot-contract.cjs");

function buildDataApiSnapshot(contract) {
  const resources = {};
  for (const [path, item] of Object.entries(contract.paths)) {
    const resource = /^\/rest\/v1\/([a-z_]+)$/.exec(path)?.[1];
    if (!resource || !item.get) continue;

    const parameters = [...(item.parameters ?? []), ...item.get.parameters].map(
      (parameter) =>
        parameter.$ref
          ? contract.components.parameters[parameter.$ref.split("/").pop()]
          : parameter,
    );
    const query = parameters.filter((parameter) => parameter.in === "query");
    const projection = item.get["x-projection-fields"];
    const select = query.find(
      (parameter) => parameter.name === "select",
    )?.schema;
    const order = query.find((parameter) => parameter.name === "order")?.schema;
    if (
      !projection?.length ||
      !select?.pattern ||
      !order?.pattern ||
      !order.default
    ) {
      throw new Error(
        `Data API resource ${resource} lacks projection or ordering rules.`,
      );
    }
    const filters = {};
    for (const parameter of query) {
      if (["select", "order", "limit", "offset"].includes(parameter.name)) {
        continue;
      }
      const schema = parameter.schema;
      if (
        schema?.type !== "string" ||
        typeof schema.pattern !== "string" ||
        !Number.isInteger(schema.maxLength) ||
        schema.maxLength < 1
      ) {
        throw new Error(
          `Data API resource ${resource} filter ${parameter.name} lacks string pattern or maxLength.`,
        );
      }
      if (Object.hasOwn(filters, parameter.name)) {
        throw new Error(
          `Data API resource ${resource} declares duplicate filter ${parameter.name}.`,
        );
      }
      // The frozen contract's created_at/and patterns use [0-9:.+-Z] where +-Z
      // would otherwise form a range including commas and uppercase letters.
      filters[parameter.name] = {
        pattern: schema.pattern.replaceAll("[0-9:.+-Z]", "[0-9:.+\\-Z]"),
        maxLength: schema.maxLength,
      };
    }
    resources[resource] = {
      projection: projection.join(","),
      query: [...new Set(query.map((parameter) => parameter.name))],
      select: { pattern: select.pattern, maxLength: select.maxLength },
      order: { pattern: order.pattern, maxLength: order.maxLength },
      // Date-only defaults get an id tie-breaker so pages stay stable.
      defaultOrder: /(^|,)(student_)?id\./.test(order.default)
        ? order.default
        : `${order.default},id.desc`,
      filters,
    };
  }
  if (!Object.keys(resources).length) throw new Error("No Data API resources.");
  return resources;
}

if (require.main === module) {
  const output = "supabase/functions/_shared/data-api-contract.json";
  const snapshot = withPinnedContract(buildDataApiSnapshot);
  const formatted = execFileSync(
    process.execPath,
    ["node_modules/prettier/bin/prettier.cjs", "--stdin-filepath", output],
    { input: JSON.stringify(snapshot), encoding: "utf8" },
  );
  fs.writeFileSync(output, formatted);
}

module.exports = { buildDataApiSnapshot };
