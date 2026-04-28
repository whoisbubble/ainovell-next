import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  MistralJsonGenerationError,
  requestValidatedMistralJson,
} from "@/lib/mistral";
import {
  buildGenerateGameUserPrompt,
  SYSTEM_PROMPT_GENERATE_GAME,
} from "@/lib/prompts";
import { buildSchemaErrorMessage } from "@/lib/api-errors";
import {
  gameConfigSchema,
  generateGameRequestSchema,
} from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = generateGameRequestSchema.parse(body);

    const mistralResult = await requestValidatedMistralJson({
      label: "GameConfig",
      schema: gameConfigSchema,
      systemPrompt: SYSTEM_PROMPT_GENERATE_GAME,
      userPrompt: buildGenerateGameUserPrompt({
        prompt: parsedBody.prompt,
        language: parsedBody.language,
        maxTurns: parsedBody.maxTurns,
      }),
    });

    return NextResponse.json({ gameConfig: mistralResult.data });
  } catch (error) {
    if (error instanceof MistralJsonGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: buildSchemaErrorMessage({
            title: "Запрос к генерации игры не прошел локальную валидацию.",
            error,
            rawText: "{}",
          }),
          details: error.flatten(),
        },
        { status: 422 },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Не удалось создать игру из-за неизвестной ошибки.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
