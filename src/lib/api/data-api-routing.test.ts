import { expect, it, vi } from "vitest";
import { createSaaisApiClient } from "./client";

it("routes signed-in Supabase collection reads through the Data API gateway", async () => {
  const fetch = vi.fn(async (request: Request) => {
    const forwarded = new URL(request.url);
    expect(forwarded.pathname).toBe("/functions/v1/data-api/course");
    expect(forwarded.searchParams.get("limit")).toBe("1");
    expect(request.headers.get("Accept-Profile")).toBe("saais_api");
    expect(request.headers.get("Authorization")).toBe("Bearer jwt");
    return Response.json([]);
  });
  const client = createSaaisApiClient({
    baseUrl: "https://project.supabase.co",
    apiKey: "public-key",
    mode: "supabase",
    getAccessToken: () => "jwt",
    fetch,
  });

  const result = await client.GET("/rest/v1/course", {
    params: { query: { limit: 1 } },
  });
  expect(result.data).toEqual([]);
  expect(fetch).toHaveBeenCalledOnce();
});
