import { readFile } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
} from "node:path";
import { parse, stringify } from "yaml";

const bundleCache = new Map();

function ensureWithinRoot(rootDir, targetPath) {
  const rel = relative(rootDir, targetPath);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`OpenAPI $ref escapes contract root: ${targetPath}`);
  }
  return rel.replace(/\\/g, "/");
}

function componentTarget(relFromRoot) {
  const match = /^components\/([^/]+)\/([^/]+)\.ya?ml$/i.exec(relFromRoot);
  if (!match) return null;
  const [, section, name] = match;
  return { section, name, ref: `#/components/${section}/${name}` };
}

function resolveJsonPointer(document, pointer) {
  if (!pointer || pointer === "/") return document;
  const segments = pointer
    .replace(/^\//, "")
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
  let current = document;
  for (const segment of segments) {
    const property =
      current !== null && typeof current === "object"
        ? Object.getOwnPropertyDescriptor(current, segment)
        : undefined;
    if (!property || !Object.hasOwn(property, "value")) {
      throw new Error(`Unresolved OpenAPI pointer: #${pointer}`);
    }
    current = property.value;
  }
  return current;
}

/**
 * Resolves all relative YAML `$ref` files referenced from `contract/openapi.yaml`
 * into a single self-contained OpenAPI 3.1 YAML string suitable for browser
 * Blob-URL Redoc rendering and direct YAML downloads.
 */
export async function loadBundledOpenApiYaml(
  entryPath = resolve(process.cwd(), "contract/openapi.yaml"),
) {
  const resolvedEntry = resolve(entryPath);
  if (bundleCache.has(resolvedEntry)) {
    return bundleCache.get(resolvedEntry);
  }

  const contractRoot = dirname(resolvedEntry);
  const parsedFiles = new Map();
  const seenComponents = new Map();

  async function readYamlFile(filePath) {
    if (parsedFiles.has(filePath)) return parsedFiles.get(filePath);
    const raw = await readFile(filePath, "utf8");
    const parsed = parse(raw);
    parsedFiles.set(filePath, parsed);
    return parsed;
  }

  const root = await readYamlFile(resolvedEntry);
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    throw new Error("Canonical OpenAPI entry file is not a YAML object.");
  }

  const components =
    root.components &&
    typeof root.components === "object" &&
    !Array.isArray(root.components)
      ? { ...root.components }
      : {};

  async function resolveNode(node, currentDir, activeFiles) {
    if (Array.isArray(node)) {
      const items = [];
      for (const item of node) {
        items.push(await resolveNode(item, currentDir, activeFiles));
      }
      return items;
    }

    if (!node || typeof node !== "object") {
      return node;
    }

    if (
      typeof node.$ref === "string" &&
      !node.$ref.startsWith("#") &&
      !/^[a-z][a-z0-9+.-]*:/i.test(node.$ref)
    ) {
      const hashIndex = node.$ref.indexOf("#");
      const filePart =
        hashIndex === -1 ? node.$ref : node.$ref.slice(0, hashIndex);
      const pointerPart =
        hashIndex === -1 ? "" : node.$ref.slice(hashIndex + 1);
      const targetPath = resolve(currentDir, filePart);
      const relFromRoot = ensureWithinRoot(contractRoot, targetPath);

      const siblingEntries = [];
      for (const [key, value] of Object.entries(node)) {
        if (key === "$ref") continue;
        siblingEntries.push([
          key,
          await resolveNode(value, currentDir, activeFiles),
        ]);
      }
      const siblings = Object.fromEntries(siblingEntries);

      const component = !pointerPart ? componentTarget(relFromRoot) : null;
      if (component) {
        if (!seenComponents.has(targetPath)) {
          seenComponents.set(targetPath, component.ref);
          const targetDoc = await readYamlFile(targetPath);
          const resolvedComponent = await resolveNode(
            targetDoc,
            dirname(targetPath),
            new Set([targetPath]),
          );
          const existingSection = Object.getOwnPropertyDescriptor(
            components,
            component.section,
          )?.value;
          Object.defineProperty(components, component.section, {
            value: {
              ...(existingSection && typeof existingSection === "object"
                ? existingSection
                : {}),
              [component.name]: resolvedComponent,
            },
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
        return { ...siblings, $ref: component.ref };
      }

      if (activeFiles.has(targetPath)) {
        const name = basename(targetPath, extname(targetPath));
        throw new Error(`Circular non-component OpenAPI $ref: ${name}`);
      }

      const targetDoc = await readYamlFile(targetPath);
      const targetValue = pointerPart
        ? resolveJsonPointer(targetDoc, pointerPart)
        : targetDoc;
      const nextActive = new Set(activeFiles);
      nextActive.add(targetPath);
      const resolvedTarget = await resolveNode(
        targetValue,
        dirname(targetPath),
        nextActive,
      );

      if (
        resolvedTarget &&
        typeof resolvedTarget === "object" &&
        !Array.isArray(resolvedTarget) &&
        Object.keys(siblings).length > 0
      ) {
        return { ...resolvedTarget, ...siblings };
      }
      return resolvedTarget;
    }

    const entries = [];
    for (const [key, value] of Object.entries(node)) {
      entries.push([key, await resolveNode(value, currentDir, activeFiles)]);
    }
    return Object.fromEntries(entries);
  }

  const bundled = await resolveNode(
    root,
    contractRoot,
    new Set([resolvedEntry]),
  );
  bundled.components = components;

  const yamlText = stringify(bundled, { lineWidth: 0 });
  bundleCache.set(resolvedEntry, yamlText);
  return yamlText;
}

export function clearBundledOpenApiCache() {
  bundleCache.clear();
}
