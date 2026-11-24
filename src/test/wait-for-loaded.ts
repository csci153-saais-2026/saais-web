import { expect } from "vitest";
import { waitFor } from "@testing-library/react";

/**
 * Resolves once every skeleton has been replaced by its loaded content.
 * Skeletons render layout samples, so a query that matches while one is up
 * can match the sample instead of real data.
 */
export async function waitForLoaded() {
  await waitFor(() =>
    expect(
      document.querySelector('[aria-busy="true"], [skullet-loading]'),
    ).toBeNull(),
  );
}
