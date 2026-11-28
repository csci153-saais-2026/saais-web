import snapshot from "./data-api-contract.json" with { type: "json" };

const maxQueryLength = 16_384;
const allowedPrefer = new Set([
  "count=exact",
  "count=planned",
  "count=estimated",
]);
const pagination = {
  limit: { minimum: 1, maximum: 1000, default: 20 },
  offset: { minimum: 0, maximum: 100000 },
} as const;

function hasControlCharacter(value: string) {
  for (let index = 0; index < value.length; index++) {
    if (value.charCodeAt(index) < 32) return true;
  }
  return false;
}

const resources = new Map(
  Object.entries(snapshot).map(([name, resource]) => [
    name,
    {
      projection: resource.projection,
      defaultOrder: resource.defaultOrder,
      query: new Set(resource.query),
      select: {
        pattern: new RegExp(resource.select.pattern),
        maxLength: resource.select.maxLength,
      },
      order: {
        pattern: new RegExp(resource.order.pattern),
        maxLength: resource.order.maxLength,
      },
      filters: new Map(
        Object.entries(resource.filters).map(([filterName, rule]) => [
          filterName,
          {
            pattern: new RegExp(rule.pattern),
            maxLength: rule.maxLength,
          },
        ]),
      ),
    },
  ]),
);

export const defaultDataApiLimit = pagination.limit.default;

export function getDataApiResource(name: string) {
  return resources.get(name);
}

export function validateDataApiQuery(
  resource: NonNullable<ReturnType<typeof getDataApiResource>>,
  url: URL,
  prefer: string | null,
): string | null {
  if (prefer !== null && !allowedPrefer.has(prefer)) {
    return "Unsupported Data API Prefer header.";
  }
  if (url.search.length > maxQueryLength) {
    return "Data API query is too long.";
  }

  for (const name of url.searchParams.keys()) {
    if (!resource.query.has(name)) {
      return "Unsupported Data API query parameter.";
    }
  }
  for (const name of ["select", "order"] as const) {
    const values = url.searchParams.getAll(name);
    const value = values[0];
    const rule = resource[name];
    if (
      values.length > 1 ||
      (value !== undefined &&
        !(name === "select" && value === "*") &&
        (value !== value.trim() ||
          value.length > rule.maxLength ||
          !rule.pattern.test(value)))
    ) {
      return `Unsupported Data API ${name}.`;
    }
  }
  for (const [name, { minimum, maximum }] of Object.entries(pagination)) {
    const values = url.searchParams.getAll(name);
    if (values.length === 0) continue;
    const value = values[0];
    if (
      values.length !== 1 ||
      !value ||
      /\D/.test(value) ||
      Number(value) < minimum ||
      Number(value) > maximum
    ) {
      return `Data API ${name} must be an integer between ${minimum} and ${maximum}.`;
    }
  }
  for (const name of new Set(url.searchParams.keys())) {
    const rule = resource.filters.get(name);
    if (!rule) continue;
    const values = url.searchParams.getAll(name);
    const value = values[0];
    if (
      values.length !== 1 ||
      value === undefined ||
      value.length > rule.maxLength ||
      hasControlCharacter(value) ||
      !rule.pattern.test(value)
    ) {
      return `Unsupported Data API ${name} filter.`;
    }
  }
  return null;
}
