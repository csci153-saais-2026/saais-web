const {
  revision,
  version,
  candidateHash,
  migration,
  buildSnapshot: buildCatalogSnapshot,
} = require("./snapshot-contract.cjs");

function buildSnapshot(source) {
  const taken = new Set(
    buildCatalogSnapshot(source).operations.map((operation) => operation.id),
  );
  const operations = [];
  const schemas = {};

  function collect(value) {
    if (!value || typeof value !== "object") return;
    if (value.$ref?.startsWith("#/components/schemas/")) {
      const name = value.$ref.split("/").pop();
      if (!schemas[name]) {
        schemas[name] = source.components.schemas[name];
        collect(schemas[name]);
      }
    }
    for (const nested of Object.values(value)) collect(nested);
  }

  for (const [route, item] of Object.entries(source.paths)) {
    if (!route.startsWith("/functions/v1/")) continue;
    for (const [method, operation] of Object.entries(item)) {
      if (!operation.operationId || taken.has(operation.operationId)) continue;
      const success = Object.keys(operation.responses).find((status) =>
        /^2/.test(status),
      );
      const parameters = [
        ...(item.parameters || []),
        ...(operation.parameters || []),
      ].map((parameter) => {
        if (!parameter.$ref) return parameter;
        return source.components.parameters[parameter.$ref.split("/").pop()];
      });
      operations.push({
        id: operation.operationId,
        path: route,
        method: method.toUpperCase(),
        roles: operation["x-required-roles"],
        parameters,
        bodyRequired: operation.requestBody?.required ?? false,
        input:
          operation.requestBody?.content["application/json"].schema ?? null,
        status: success ? Number(success) : null,
        output:
          (success &&
            operation.responses[success].content?.["application/json"]
              .schema) ||
          null,
        errors: Object.keys(operation.responses)
          .filter((status) => /^[45][0-9]{2}$/.test(status))
          .map(Number),
        public:
          operation.security?.some(
            (requirement) => !Object.hasOwn(requirement, "supabaseBearerAuth"),
          ) === true && operation["x-required-roles"].length === 0,
      });
    }
  }
  if (operations.length !== 42)
    throw new Error(
      `Expected 42 remaining Edge operations, found ${operations.length}.`,
    );
  operations.forEach(collect);
  return { revision, version, candidateHash, operations, schemas };
}

module.exports = { buildSnapshot, migration };

if (require.main === module)
  require("./snapshot-runtime-contracts.cjs").writeRuntimeSnapshots();
