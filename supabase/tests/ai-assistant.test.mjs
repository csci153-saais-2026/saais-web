import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../functions/_shared/http.ts";
import {
  assistantAnswer,
  readAssistantConfig,
} from "../functions/_shared/ai-assistant.ts";

test("checks record scope before contacting the assistant provider", async () => {
  const endpoint = "https://assistant.example.test/chat/completions";
  const id = "00000005-0000-4000-8000-000000000000";
  const env = {
    url: "https://example.supabase.co",
    publicKey: "test",
    origins: [],
    assistant: { endpoint, key: "provider-test-key", model: "test" },
  };
  let allowed = false;
  let called = 0;
  const handler = createHandler("students", {
    env,
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id });
      if (url.endsWith("/matt_assistant_context")) {
        if (!allowed)
          return Response.json(
            { code: "PT403", message: "Denied" },
            { status: 403 },
          );
        return Response.json({
          grounded_at: "2026-11-13T00:00:00Z",
          request: { message: "What is the GWA?" },
          record: { gwa: 2 },
        });
      }
      assert.equal(url, endpoint);
      assert.equal(options.headers.Authorization, "Bearer provider-test-key");
      called++;
      return Response.json({
        choices: [{ message: { content: "The record shows a GWA of 2." } }],
      });
    },
  });
  const request = () =>
    new Request(env.url + "/students/" + id + "/assistant", {
      method: "POST",
      headers: {
        apikey: "test",
        Authorization: "Bearer session",
        "Content-Type": "application/json",
      },
      body: '{"message":"What is the GWA?"}',
    });
  assert.equal((await handler(request())).status, 403);
  assert.equal(called, 0);
  allowed = true;
  const result = await handler(request());
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(data.mutates_records, false);
  assert.match(data.answer, /GWA of 2/);
  assert.equal(called, 1);
});

const student = "00000005-0000-4000-8000-000000000000";
const settings = {
  url: "https://supabase.example.test",
  publicKey: "test-public-key",
  origins: [],
  assistant: {
    endpoint: "https://assistant.example.test/chat/completions",
    key: "private-test-provider-key",
    model: "test-model",
  },
};
const context = {
  grounded_at: "2026-11-21T12:00:00Z",
  request: { message: "What is recorded?" },
  record: { gwa: 2 },
};
const headers = {
  apikey: settings.publicKey,
  Authorization: "Bearer current-adviser",
  "Content-Type": "application/json",
};
const ask = (requestHeaders = headers) =>
  new Request(`${settings.url}/students/${student}/assistant`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(context.request),
  });

function assistantHandler(provider, upstreamContext = context) {
  return createHandler("students", {
    env: settings,
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/matt_assistant_context"))
        return Response.json(upstreamContext);
      return provider(url, options);
    },
  });
}

test("assistant requires authentication and current-adviser scope before any provider request", async () => {
  let providerCalls = 0;
  const handler = createHandler("students", {
    env: settings,
    fetch: async (url) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/matt_assistant_context"))
        return Response.json(
          { code: "PT403", message: "Current adviser required." },
          { status: 403 },
        );
      providerCalls++;
      throw new Error("Unauthorized provider request.");
    },
  });
  assert.equal(
    (await handler(ask({ "Content-Type": "application/json" }))).status,
    401,
  );
  const rejected = await handler(ask());
  assert.equal(rejected.status, 403);
  assert.equal(providerCalls, 0);
  assert.equal((await rejected.json()).details, null);
});

test("assistant provider failures return a sanitized declared error", async () => {
  const failures = [
    () =>
      Response.json(
        { detail: "private provider information" },
        { status: 503 },
      ),
    () => {
      throw new DOMException("private provider timeout", "TimeoutError");
    },
    () => new Response("not JSON"),
    () => Response.json({ choices: [] }),
    () => Response.json({ choices: [{ message: { content: "  " } }] }),
    () => Response.json({ choices: [{ message: { content: 42 } }] }),
    () => new Response("x".repeat(65537)),
  ];
  for (const failure of failures) {
    const result = await assistantHandler(failure)(ask());
    assert.equal(result.status, 500);
    assert.deepEqual(await result.json(), {
      code: "XX000",
      message: "The operation could not be completed.",
      details: null,
      hint: null,
    });
  }
});

test("assistant response follows the approved schema and applies its output budget", async () => {
  const runtime = (
    await import("../functions/_shared/matt-contract.json", {
      with: { type: "json" },
    })
  ).default;
  const schema = runtime.schemas.AdvisingAIResponse;
  const result = await assistantHandler((_url, options) => {
    assert.equal(options.redirect, "error");
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(
      options.headers.Authorization,
      `Bearer ${settings.assistant.key}`,
    );
    return Response.json({
      choices: [{ message: { content: "A".repeat(9000) } }],
      mutates_records: true,
    });
  })(ask());
  assert.equal(result.status, 200);
  const response = await result.json();
  assert.deepEqual(Object.keys(response).sort(), [...schema.required].sort());
  for (const field of ["answer", "verification_notice"]) {
    assert.equal(typeof response[field], "string");
    assert.ok(
      response[field].trim().length >= schema.properties[field].minLength,
    );
    assert.ok(response[field].length <= schema.properties[field].maxLength);
  }
  assert.equal(response.answer.length, 8000);
  assert.equal(response.grounded_at, context.grounded_at);
  assert.ok(Number.isFinite(Date.parse(response.grounded_at)));
  assert.equal(
    response.mutates_records,
    schema.properties.mutates_records.const,
  );
});

test("malformed context is rejected before sending any facts to the provider", async () => {
  let called = false;
  const result = await assistantHandler(
    () => {
      called = true;
      return Response.json({});
    },
    { ...context, grounded_at: "unverified timestamp" },
  )(ask());
  assert.equal(result.status, 500);
  assert.equal(called, false);
});

test("supports native Google Gemini generateContent requests and filters internal thought parts", async () => {
  const vars = {
    SAAIS_ASSISTANT_GEMINI_API_KEY: "gemini-secret-key",
    SAAIS_ASSISTANT_GEMINI_MODEL: "gemini-2.5-flash",
  };
  const assistant = readAssistantConfig((name) => vars[name]);
  assert.ok(assistant);
  assert.equal(assistant.provider, "gemini");
  assert.equal(assistant.protocol, "gemini");
  assert.equal(
    assistant.endpoint,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  );

  let capturedUrl = "";
  let capturedHeaders;
  let capturedBody;
  const handler = createHandler("students", {
    env: { ...settings, assistant },
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/matt_assistant_context"))
        return Response.json({
          grounded_at: "2026-11-21T12:00:00Z",
          request: {
            message: "What is recorded?",
            history: [
              { role: "user", content: "Prior question" },
              { role: "assistant", content: "Prior answer" },
            ],
          },
          record: { gwa: 1.75 },
        });
      capturedUrl = url;
      capturedHeaders = options.headers;
      capturedBody = JSON.parse(options.body);
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                { text: "Internal reasoning", thought: true },
                { text: "The student record shows a GWA of 1.75." },
              ],
            },
          },
        ],
      });
    },
  });

  const response = await handler(ask());
  assert.equal(response.status, 200);
  assert.equal(capturedUrl, assistant.endpoint);
  assert.equal(capturedHeaders["x-goog-api-key"], "gemini-secret-key");
  assert.equal(capturedHeaders.Authorization, undefined);
  assert.equal(capturedBody.generationConfig.maxOutputTokens, 800);
  assert.equal(capturedBody.contents.length, 3);
  assert.equal(capturedBody.contents[0].role, "user");
  assert.equal(capturedBody.contents[1].role, "model");
  assert.equal(capturedBody.contents[2].role, "user");
  const data = await response.json();
  assert.equal(data.answer, "The student record shows a GWA of 1.75.");
  assert.equal(data.mutates_records, false);
});

test("orders configured Gemini, NVIDIA NIM, and OpenAI-compatible providers and falls back on upstream failure", async () => {
  const vars = {
    SAAIS_ASSISTANT_PROVIDERS: "openai,gemini,nvidia",
    SAAIS_ASSISTANT_GEMINI_API_KEY: "gemini-key",
    SAAIS_ASSISTANT_GEMINI_MODEL: "gemini-2.5-flash",
    SAAIS_ASSISTANT_NVIDIA_API_KEY: "nvidia-key",
    SAAIS_ASSISTANT_NVIDIA_MODEL: "meta/llama-3.3-70b-instruct",
    SAAIS_ASSISTANT_OPENAI_ENDPOINT:
      "https://openai-compatible.example.test/v1/chat/completions",
    SAAIS_ASSISTANT_OPENAI_API_KEY: "openai-key",
    SAAIS_ASSISTANT_OPENAI_MODEL: "gpt-4o-mini",
  };
  const assistant = readAssistantConfig((name) => vars[name]);
  assert.ok(assistant);
  assert.equal(assistant.providers?.length, 3);
  assert.deepEqual(
    assistant.providers.map((item) => item.provider),
    ["openai", "gemini", "nvidia"],
  );

  const attempted = [];
  const handler = createHandler("students", {
    env: { ...settings, assistant },
    fetch: async (url, options) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: student });
      if (url.endsWith("/matt_assistant_context"))
        return Response.json(context);
      attempted.push({ url, options });
      if (
        url === "https://openai-compatible.example.test/v1/chat/completions"
      ) {
        assert.equal(options.headers.Authorization, "Bearer openai-key");
        return Response.json(
          { error: { message: "Quota exceeded" } },
          { status: 429 },
        );
      }
      if (url.includes("generativelanguage.googleapis.com")) {
        assert.equal(options.headers["x-goog-api-key"], "gemini-key");
        return Response.json({
          candidates: [
            {
              content: {
                parts: [
                  { text: "Gemini fallback answer from academic facts." },
                ],
              },
            },
          ],
        });
      }
      throw new Error("Should not reach third provider when second succeeds");
    },
  });

  const response = await handler(ask());
  assert.equal(response.status, 200);
  assert.equal(attempted.length, 2);
  const data = await response.json();
  assert.equal(data.answer, "Gemini fallback answer from academic facts.");
  assert.match(attempted[0].url, /openai-compatible/);
  assert.match(attempted[1].url, /generativelanguage/);
});

test("rejects non-HTTPS, credential-bearing, or path-injecting provider configs", () => {
  assert.equal(
    readAssistantConfig(
      (name) =>
        ({
          SAAIS_ASSISTANT_ENDPOINT: "http://insecure.example.test/v1/chat",
          SAAIS_ASSISTANT_API_KEY: "key",
          SAAIS_ASSISTANT_MODEL: "model",
        })[name],
    ),
    undefined,
  );
  assert.equal(
    readAssistantConfig(
      (name) =>
        ({
          SAAIS_ASSISTANT_ENDPOINT:
            "https://user:pass@assistant.example.test/v1/chat",
          SAAIS_ASSISTANT_API_KEY: "key",
          SAAIS_ASSISTANT_MODEL: "model",
        })[name],
    ),
    undefined,
  );
  assert.equal(
    readAssistantConfig(
      (name) =>
        ({
          SAAIS_ASSISTANT_GEMINI_API_KEY: "key",
          SAAIS_ASSISTANT_GEMINI_MODEL: "../malicious-path",
        })[name],
    ),
    undefined,
  );
});

test("safety blocks and incomplete answers stop rather than retry another provider", async () => {
  const vars = {
    SAAIS_ASSISTANT_GEMINI_API_KEY: "gemini-key",
    SAAIS_ASSISTANT_GEMINI_MODEL: "gemini-test",
    SAAIS_ASSISTANT_NVIDIA_API_KEY: "nvidia-key",
    SAAIS_ASSISTANT_NVIDIA_MODEL: "nim-test",
  };
  const assistant = readAssistantConfig((name) => vars[name]);
  for (const result of [
    { promptFeedback: { blockReason: "SAFETY" } },
    { candidates: [{ finishReason: "ESCALATION" }] },
    {
      candidates: [
        { finishReason: "SAFETY", content: { parts: [{ text: "blocked" }] } },
      ],
    },
    {
      candidates: [
        {
          finishReason: "MAX_TOKENS",
          content: { parts: [{ text: "partial" }] },
        },
      ],
    },
    {
      candidates: [
        {
          finishReason: "CONTINUATION",
          content: { parts: [{ text: "partial" }] },
        },
      ],
    },
  ]) {
    const attempted = [];
    const handler = createHandler("students", {
      env: { ...settings, assistant },
      fetch: async (url) => {
        if (url.endsWith("/auth/v1/user"))
          return Response.json({ id: student });
        if (url.endsWith("/matt_assistant_context"))
          return Response.json(context);
        attempted.push(url);
        return Response.json(result);
      },
    });
    const response = await handler(ask());
    assert.equal(response.status, 500);
    assert.equal(
      (await response.json()).message,
      "The operation could not be completed.",
    );
    assert.equal(attempted.length, 1);
    assert.match(attempted[0], /generativelanguage\.googleapis\.com/);
  }
  for (const choice of [
    { finish_reason: "content_filter", message: { content: "blocked" } },
    { message: { refusal: "I cannot answer" } },
    { finish_reason: "length", message: { content: "partial" } },
  ]) {
    let calls = 0;
    const providers = [
      settings.assistant,
      { ...settings.assistant, endpoint: "https://fallback.example.test" },
    ];
    await assert.rejects(
      assistantAnswer(
        { ...settings.assistant, providers },
        async () => {
          calls++;
          return Response.json({ choices: [choice] });
        },
        context,
      ),
    );
    assert.equal(calls, 1);
  }
});

test("distinct legacy and provider-specific keys remain usable during key rotation", async () => {
  const vars = {
    SAAIS_ASSISTANT_PROVIDER: "nvidia",
    SAAIS_ASSISTANT_API_KEY: "old-test-key",
    SAAIS_ASSISTANT_MODEL: "same-model",
    SAAIS_ASSISTANT_NVIDIA_API_KEY: "new-test-key",
    SAAIS_ASSISTANT_NVIDIA_MODEL: "same-model",
  };
  const assistant = readAssistantConfig((name) => vars[name]);
  assert.equal(assistant.providers.length, 2);
  const used = [];
  const result = await assistantAnswer(
    assistant,
    async (_url, options) => {
      used.push(options.headers.Authorization);
      return used.length === 1
        ? Response.json({}, { status: 401 })
        : Response.json({ choices: [{ message: { content: "Answer" } }] });
    },
    context,
  );
  assert.equal(result.answer, "Answer");
  assert.deepEqual(used, ["Bearer old-test-key", "Bearer new-test-key"]);
  vars.SAAIS_ASSISTANT_NVIDIA_API_KEY = "old-test-key";
  assert.equal(readAssistantConfig((name) => vars[name]).providers.length, 1);
});

test("the complete fallback chain shares one 12-second budget", async () => {
  const vars = {
    SAAIS_ASSISTANT_GEMINI_API_KEY: "a",
    SAAIS_ASSISTANT_GEMINI_MODEL: "m",
    SAAIS_ASSISTANT_NVIDIA_API_KEY: "b",
    SAAIS_ASSISTANT_NVIDIA_MODEL: "n",
    SAAIS_ASSISTANT_OPENAI_API_KEY: "c",
    SAAIS_ASSISTANT_OPENAI_MODEL: "o",
  };
  const assistant = readAssistantConfig((name) => vars[name]);
  let clock = 100000;
  const originalNow = Object.getOwnPropertyDescriptor(performance, "now");
  const originalDateNow = Date.now;
  const originalTimeout = AbortSignal.timeout;
  const limits = [];
  try {
    Object.defineProperty(performance, "now", {
      configurable: true,
      value: () => clock,
    });
    Date.now = () => 100000 - (clock - 100000);
    AbortSignal.timeout = (ms) => {
      limits.push(ms);
      return new AbortController().signal;
    };
    await assert.rejects(
      assistantAnswer(
        assistant,
        async () => {
          clock += limits.at(-1);
          throw new Error("timeout");
        },
        context,
      ),
    );
    assert.deepEqual(limits, [4000, 4000, 4000]);
    assert.equal(clock, 112000);
  } finally {
    if (originalNow) Object.defineProperty(performance, "now", originalNow);
    else delete performance.now;
    Date.now = originalDateNow;
    AbortSignal.timeout = originalTimeout;
  }
});

test("the time budget adapts to one or four configured candidates", async () => {
  const provider = {
    endpoint: "https://provider.example.test/v1/chat/completions",
    key: "test-key",
    model: "test-model",
  };
  for (const count of [1, 4]) {
    const providers = Array.from({ length: count }, () => provider);
    const originalNow = Object.getOwnPropertyDescriptor(performance, "now");
    const originalTimeout = AbortSignal.timeout;
    const limits = [];
    let clock = 100000;
    try {
      Object.defineProperty(performance, "now", {
        configurable: true,
        value: () => clock,
      });
      AbortSignal.timeout = (ms) => {
        limits.push(ms);
        return new AbortController().signal;
      };
      await assert.rejects(
        assistantAnswer(
          { ...provider, providers },
          async () => {
            clock += limits.at(-1);
            throw new Error("timeout");
          },
          context,
        ),
      );
      assert.deepEqual(limits, Array(count).fill(12000 / count));
      assert.equal(clock, 112000);
    } finally {
      if (originalNow) Object.defineProperty(performance, "now", originalNow);
      else delete performance.now;
      AbortSignal.timeout = originalTimeout;
    }
  }
});

test("full Gemini endpoint must match the configured model", () => {
  const vars = {
    SAAIS_ASSISTANT_GEMINI_API_KEY: "key",
    SAAIS_ASSISTANT_GEMINI_MODEL: "gemini-new",
    SAAIS_ASSISTANT_GEMINI_ENDPOINT:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-old:generateContent",
  };
  assert.equal(
    readAssistantConfig((name) => vars[name]),
    undefined,
  );
  const legacy = {
    SAAIS_ASSISTANT_API_KEY: "key",
    SAAIS_ASSISTANT_MODEL: "gemini-new",
    SAAIS_ASSISTANT_ENDPOINT: vars.SAAIS_ASSISTANT_GEMINI_ENDPOINT,
  };
  assert.equal(
    readAssistantConfig((name) => legacy[name]),
    undefined,
  );
  vars.SAAIS_ASSISTANT_GEMINI_ENDPOINT =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-new:generateContent";
  assert.equal(readAssistantConfig((name) => vars[name]).model, "gemini-new");
  legacy.SAAIS_ASSISTANT_ENDPOINT = vars.SAAIS_ASSISTANT_GEMINI_ENDPOINT;
  assert.equal(readAssistantConfig((name) => legacy[name]).model, "gemini-new");
});

test("Gemini base routes preserve query strings and existing full endpoints", () => {
  for (const [endpoint, expected] of [
    [
      "https://gateway.example.test/v1beta?tenant=school",
      "https://gateway.example.test/v1beta/models/gemini-test:generateContent?tenant=school",
    ],
    [
      "https://gateway.example.test/v1/models/?tenant=school",
      "https://gateway.example.test/v1/models/gemini-test:generateContent?tenant=school",
    ],
    [
      "https://gateway.example.test/custom?tenant=school",
      "https://gateway.example.test/custom/v1beta/models/gemini-test:generateContent?tenant=school",
    ],
    [
      "https://gateway.example.test/v1beta/models/gemini-test:generateContent?tenant=school",
      "https://gateway.example.test/v1beta/models/gemini-test:generateContent?tenant=school",
    ],
    [
      "https://gateway.example.test/v1/chat/completions?tenant=school",
      "https://gateway.example.test/v1/chat/completions?tenant=school",
    ],
  ]) {
    const vars = {
      SAAIS_ASSISTANT_GEMINI_ENDPOINT: endpoint,
      SAAIS_ASSISTANT_GEMINI_API_KEY: "key",
      SAAIS_ASSISTANT_GEMINI_MODEL: "gemini-test",
    };
    assert.equal(readAssistantConfig((name) => vars[name])?.endpoint, expected);
  }
});

test("custom-host native Gemini routes must match the configured model", () => {
  const vars = {
    SAAIS_ASSISTANT_ENDPOINT:
      "https://gateway.example.test/v1beta/models/gemini-old:generateContent",
    SAAIS_ASSISTANT_API_KEY: "key",
    SAAIS_ASSISTANT_MODEL: "gemini-new",
  };
  assert.equal(
    readAssistantConfig((name) => vars[name]),
    undefined,
  );
  vars.SAAIS_ASSISTANT_ENDPOINT =
    "https://gateway.example.test/v1beta/models/gemini-new:generateContent";
  assert.equal(readAssistantConfig((name) => vars[name])?.protocol, "gemini");
  vars.SAAIS_ASSISTANT_ENDPOINT =
    "https://gateway.example.test/v1/chat/completions";
  assert.equal(readAssistantConfig((name) => vars[name])?.protocol, "openai");
});

test("deduplicates native Gemini model aliases but preserves keys and chat model variants", () => {
  const vars = {
    SAAIS_ASSISTANT_PROVIDER: "gemini",
    SAAIS_ASSISTANT_API_KEY: "same-key",
    SAAIS_ASSISTANT_MODEL: "models/gemini-test",
    SAAIS_ASSISTANT_GEMINI_API_KEY: "same-key",
    SAAIS_ASSISTANT_GEMINI_MODEL: "gemini-test",
  };
  assert.equal(readAssistantConfig((name) => vars[name]).providers.length, 1);
  vars.SAAIS_ASSISTANT_GEMINI_API_KEY = "different-key";
  assert.equal(readAssistantConfig((name) => vars[name]).providers.length, 2);
  vars.SAAIS_ASSISTANT_GEMINI_API_KEY = "same-key";
  vars.SAAIS_ASSISTANT_ENDPOINT =
    "https://gateway.example.test/v1/chat/completions";
  vars.SAAIS_ASSISTANT_GEMINI_ENDPOINT = vars.SAAIS_ASSISTANT_ENDPOINT;
  assert.equal(readAssistantConfig((name) => vars[name]).providers.length, 2);
});

test("non-OK response streams are cancelled without blocking fallback", async () => {
  const providers = [
    settings.assistant,
    {
      ...settings.assistant,
      endpoint: "https://fallback.example.test/chat/completions",
    },
  ];
  const originalTimeout = AbortSignal.timeout;
  try {
    AbortSignal.timeout = () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10);
      return controller.signal;
    };
    for (const failCleanup of [false, true]) {
      let calls = 0;
      let cancelled = false;
      const result = await assistantAnswer(
        { ...settings.assistant, providers },
        async () => {
          calls++;
          if (calls === 1)
            return new Response(
              new ReadableStream({
                cancel() {
                  cancelled = true;
                  return failCleanup
                    ? Promise.reject(new Error("cancel failed"))
                    : new Promise(() => {});
                },
              }),
              { status: 429 },
            );
          assert.equal(cancelled, true);
          return Response.json({
            choices: [{ message: { content: "Fallback answer" } }],
          });
        },
        context,
      );
      assert.equal(result.answer, "Fallback answer");
      assert.equal(calls, 2);
    }
  } finally {
    AbortSignal.timeout = originalTimeout;
  }
});

test("an empty unfiltered Gemini response can still fall back", async () => {
  const vars = {
    SAAIS_ASSISTANT_GEMINI_API_KEY: "key",
    SAAIS_ASSISTANT_GEMINI_MODEL: "model",
    SAAIS_ASSISTANT_OPENAI_API_KEY: "other",
    SAAIS_ASSISTANT_OPENAI_MODEL: "other-model",
  };
  let calls = 0;
  const result = await assistantAnswer(
    readAssistantConfig((name) => vars[name]),
    async () => {
      calls++;
      return calls === 1
        ? Response.json({ candidates: [{ finishReason: "STOP" }] })
        : Response.json({ choices: [{ message: { content: "Fallback" } }] });
    },
    context,
  );
  assert.equal(result.answer, "Fallback");
  assert.equal(calls, 2);
});

test("HTTP content-filter errors stop fallback without exposing provider details", async () => {
  const providers = [
    settings.assistant,
    {
      ...settings.assistant,
      endpoint: "https://fallback.example.test/chat/completions",
    },
  ];
  for (const status of [400, 403, 429, 503]) {
    let calls = 0;
    await assert.rejects(
      assistantAnswer(
        { ...settings.assistant, providers },
        async () => {
          calls++;
          return Response.json(
            {
              error: {
                code: "content_filter",
                message: "private filtering details",
              },
            },
            { status },
          );
        },
        context,
      ),
      /blocked by the provider/,
    );
    assert.equal(calls, 1);
  }
  const response = await assistantHandler(() =>
    Response.json(
      {
        error: { code: "content_filter", message: "private filtering details" },
      },
      { status: 400 },
    ),
  )(ask());
  assert.equal(response.status, 500);
  assert.equal(
    (await response.json()).message,
    "The operation could not be completed.",
  );
});

test("ordinary, malformed, and oversized HTTP 400 errors allow fallback", async () => {
  const providers = [
    settings.assistant,
    {
      ...settings.assistant,
      endpoint: "https://fallback.example.test/chat/completions",
    },
  ];
  for (const makeError of [
    () =>
      Response.json({ error: { code: "invalid_request" } }, { status: 400 }),
    () => new Response("not json", { status: 400 }),
    () => new Response("x".repeat(65537), { status: 400 }),
  ]) {
    let calls = 0;
    const result = await assistantAnswer(
      { ...settings.assistant, providers },
      async () => {
        calls++;
        return calls === 1
          ? makeError()
          : Response.json({ choices: [{ message: { content: "Fallback" } }] });
      },
      context,
    );
    assert.equal(result.answer, "Fallback");
    assert.equal(calls, 2);
  }
});

test("a stalled HTTP error body respects the attempt timeout and falls back", async () => {
  const providers = [
    settings.assistant,
    {
      ...settings.assistant,
      endpoint: "https://fallback.example.test/chat/completions",
    },
  ];
  const originalTimeout = AbortSignal.timeout;
  let calls = 0;
  try {
    AbortSignal.timeout = () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10);
      return controller.signal;
    };
    const answer = await assistantAnswer(
      { ...settings.assistant, providers },
      async (_url, options) => {
        calls++;
        if (calls === 1)
          return new Response(
            new ReadableStream({
              start(controller) {
                options.signal.addEventListener("abort", () =>
                  controller.error(new Error("timeout")),
                );
              },
            }),
            { status: 400 },
          );
        return Response.json({
          choices: [{ message: { content: "Fallback" } }],
        });
      },
      context,
    );
    assert.equal(answer.answer, "Fallback");
    assert.equal(calls, 2);
  } finally {
    AbortSignal.timeout = originalTimeout;
  }
});
