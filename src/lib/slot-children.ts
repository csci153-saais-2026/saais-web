import type { ReactNode } from "react";

/**
 * Skullet re-creates every element inside a skeleton's hidden measuring copy
 * with `Children.map`, which hands each element's children over as an array —
 * even a single child. Radix `Slot` (behind every `asChild` component) only
 * accepts one element, so a lone child arriving as `[child]` throws. Unwrap it
 * so `asChild` components can sit inside skeleton content.
 */
export function slotChildren(children: ReactNode): ReactNode {
  return Array.isArray(children) && children.length === 1
    ? children[0]
    : children;
}
