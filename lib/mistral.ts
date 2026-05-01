import type { ZodType } from "zod";
import { createRawPreview, formatZodIssues } from "@/lib/api-errors";

const DEFAULT_MISTRAL_API_URL =
  "https://api.mistral.ai/v1/chat/completions";
const DEFAULT_OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_TIMEOUT_MS = 120000;
const NETWORK_ATTEMPTS = 3;

type MistralRequestOptions = {
  systemPrompt: string;
  userPrompt: string;
};

export type MistralJsonResult = {
  data: unknown;
  rawText: string;
};

type ValidatedMistralJsonOptions<T> = MistralRequestOptions & {
  label: string;
  schema: ZodType<T>;
  maxAttempts?: number;
};

export class MistralJsonGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MistralJsonGenerationError";
  }
}

function getEnv() {
  const provider = (process.env.AI_PROVIDER?.trim().toLowerCase() ||
    (process.env.OPENAI_API_KEY ? "openai" : "mistral")) as
    | "mistral"
    | "openai"
    | "custom";
  const defaultApiUrl =
    provider === "openai" ? DEFAULT_OPENAI_API_URL : DEFAULT_MISTRAL_API_URL;
  const apiKey =
    process.env.AI_API_KEY?.trim() ||
    process.env.MISTRAL_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();
  const model =
    process.env.AI_MODEL?.trim() ||
    process.env.MISTRAL_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim();
  const apiUrl =
    process.env.AI_API_URL?.trim() ||
    process.env.MISTRAL_API_URL?.trim() ||
    process.env.OPENAI_API_URL?.trim() ||
    defaultApiUrl;
  const maxTokens = Number(
    process.env.AI_MAX_TOKENS ??
      process.env.MISTRAL_MAX_TOKENS ??
      DEFAULT_MAX_TOKENS,
  );
  const timeoutMs = Number(
    process.env.AI_TIMEOUT_MS ??
      process.env.MISTRAL_TIMEOUT_MS ??
      DEFAULT_TIMEOUT_MS,
  );
  const globalSystemPrompt = process.env.AI_GLOBAL_SYSTEM_PROMPT?.trim() ?? "";

  if (!apiKey) {
    throw new Error(
      "AI_API_KEY is missing. You can use AI_API_KEY, MISTRAL_API_KEY, or OPENAI_API_KEY in .env.local. Restart npm run dev after changing env.",
    );
  }

  if (!model) {
    throw new Error(
      "AI_MODEL is missing. You can use AI_MODEL, MISTRAL_MODEL, or OPENAI_MODEL in .env.local. Restart npm run dev after changing env.",
    );
  }

  return {
    provider,
    apiKey,
    model,
    apiUrl,
    maxTokens: Number.isFinite(maxTokens) ? maxTokens : DEFAULT_MAX_TOKENS,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
    globalSystemPrompt,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeError(error: unknown): string {
  if (error instanceof AggregateError) {
    return error.errors.map(describeError).join("; ");
  }

  if (error instanceof Error) {
    const errorWithCause = error as Error & {
      cause?: unknown;
      code?: string;
      errno?: string;
    };
    const parts = [`${error.name}: ${error.message}`];

    if (errorWithCause.code) {
      parts.push(`code=${errorWithCause.code}`);
    }

    if (errorWithCause.errno) {
      parts.push(`errno=${errorWithCause.errno}`);
    }

    if (errorWithCause.cause) {
      parts.push(`cause=(${describeError(errorWithCause.cause)})`);
    }

    return parts.join(" ");
  }

  return String(error);
}

function extractMessageContent(payload: unknown) {
  const data = payload as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" ? part.text ?? "" : ""))
      .join("");
  }

  throw new Error("Mistral API did not return text content.");
}

function parseModelJson(rawText: string) {
  try {
    return JSON.parse(rawText);
  } catch {
    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("JSON is incomplete or malformed.");
  }
}

function buildRetryPrompt(options: {
  originalUserPrompt: string;
  label: string;
  problem: string;
  rawText: string;
}) {
  return `
The previous answer for ${options.label} was rejected.

Problem:
${options.problem}

Previous answer preview:
${createRawPreview(options.rawText, 1200)}

Regenerate the answer from scratch using the original task below.
Do not continue the broken JSON.
Return one complete valid JSON object only.
Make the output compact:
- descriptions: 1 sentence
- asciiScene: 3-6 short lines
- dialogues: 1-3 entries
- choices: 2-3 entries for non-final scenes
- characters: include every important user-named character for GameConfig, especially all entries from a Characters/Персонажи list
- items: 3-5 entries for GameConfig

Original task:
${options.originalUserPrompt}
`;
}

async function requestMistralText({
  systemPrompt,
  userPrompt,
}: MistralRequestOptions) {
  const {
    apiKey,
    model,
    apiUrl,
    maxTokens,
    timeoutMs,
    globalSystemPrompt,
  } = getEnv();
  const finalSystemPrompt = globalSystemPrompt
    ? `${globalSystemPrompt}\n\n--- ENGINE SCHEMA RULES BELOW ---\n\n${systemPrompt}`
    : systemPrompt;
  const requestBody = JSON.stringify({
    model,
    temperature: 0.2,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: finalSystemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  let response: Response | null = null;
  let responseText = "";
  let lastNetworkError: unknown = null;

  for (let attempt = 1; attempt <= NETWORK_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const currentResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: requestBody,
        cache: "no-store",
        signal: controller.signal,
      });
      const currentResponseText = await currentResponse.text();
      response = currentResponse;
      responseText = currentResponseText;
      break;
    } catch (error) {
      lastNetworkError = error;

      if (attempt < NETWORK_ATTEMPTS) {
        await sleep(700 * attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!response) {
    throw new Error(
      `AI API connection was interrupted after ${NETWORK_ATTEMPTS} attempts.\n\nEndpoint: ${apiUrl}\nModel: ${model}\nDetails: ${describeError(lastNetworkError)}\n\nThis usually means the provider, proxy, VPN, firewall, or network closed the connection before the full response was read. Try again, lower AI_MAX_TOKENS/MISTRAL_MAX_TOKENS, or increase AI_TIMEOUT_MS/MISTRAL_TIMEOUT_MS. Restart npm run dev after changing .env.local.`,
    );
  }

  let responseJson: unknown = {};

  if (responseText) {
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      throw new Error(
        `AI API returned malformed HTTP JSON.\n\nEndpoint: ${apiUrl}\nModel: ${model}\nResponse preview:\n${createRawPreview(responseText, 800)}`,
      );
    }
  }

  if (!response.ok) {
    const apiPayload = responseJson as {
      error?: {
        message?: string;
      };
    };
    const apiMessage =
      typeof apiPayload?.error?.message === "string"
        ? apiPayload.error.message
        : "Mistral API is temporarily unavailable.";

    throw new Error(apiMessage);
  }

  return extractMessageContent(responseJson).trim();
}

export async function requestMistralJson(
  options: MistralRequestOptions,
): Promise<MistralJsonResult> {
  const messageContent = await requestMistralText(options);

  try {
    return {
      data: parseModelJson(messageContent),
      rawText: messageContent,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown parse error.";
    throw new Error(
      `AI returned invalid JSON: ${reason}\n\nResponse preview:\n${createRawPreview(messageContent)}`,
    );
  }
}

export async function requestValidatedMistralJson<T>({
  systemPrompt,
  userPrompt,
  schema,
  label,
  maxAttempts = 3,
}: ValidatedMistralJsonOptions<T>): Promise<{
  data: T;
  rawText: string;
  attempts: number;
}> {
  let currentUserPrompt = userPrompt;
  let lastRawText = "";
  let lastProblem = "Unknown error.";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const rawText = await requestMistralText({
      systemPrompt,
      userPrompt: currentUserPrompt,
    });
    lastRawText = rawText;

    let parsedJson: unknown;

    try {
      parsedJson = parseModelJson(rawText);
    } catch (error) {
      lastProblem =
        error instanceof Error
          ? `JSON parse error: ${error.message}`
          : "JSON parse error.";
      currentUserPrompt = buildRetryPrompt({
        originalUserPrompt: userPrompt,
        label,
        problem: lastProblem,
        rawText,
      });
      continue;
    }

    const validation = schema.safeParse(parsedJson);

    if (validation.success) {
      return {
        data: validation.data,
        rawText,
        attempts: attempt,
      };
    }

    lastProblem = `Schema validation errors:\n${formatZodIssues(validation.error, 12)}`;
    currentUserPrompt = buildRetryPrompt({
      originalUserPrompt: userPrompt,
      label,
      problem: lastProblem,
      rawText,
    });
  }

  throw new MistralJsonGenerationError(
    `AI could not generate a valid ${label} after ${maxAttempts} attempts.\n\nLast problem:\n${lastProblem}\n\nLast response preview:\n${createRawPreview(lastRawText)}`,
  );
}
