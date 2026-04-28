import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  MistralJsonGenerationError,
  requestValidatedMistralJson,
} from "@/lib/mistral";
import {
  buildNextSceneUserPrompt,
  SYSTEM_PROMPT_NEXT_SCENE,
} from "@/lib/prompts";
import { buildSchemaErrorMessage } from "@/lib/api-errors";
import { gameSceneSchema, nextSceneRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = nextSceneRequestSchema.parse(body);

    const mistralResult = await requestValidatedMistralJson({
      label: "GameScene",
      schema: gameSceneSchema,
      systemPrompt: SYSTEM_PROMPT_NEXT_SCENE,
      userPrompt: buildNextSceneUserPrompt(parsedBody),
    });

    return NextResponse.json({ scene: mistralResult.data });
  } catch (error) {
    if (error instanceof MistralJsonGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: buildSchemaErrorMessage({
            title: "Запрос на продолжение сцены не прошел локальную валидацию.",
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
        : "Не удалось продолжить историю из-за неизвестной ошибки.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
