import { z } from "zod";

export const PORTRAIT_PARTS = {
  hair: ["messy", "short", "long", "hood"] as const,
  face: ["neutral", "angry", "sad", "smile", "scar"] as const,
  body: ["coat", "armor", "hoodie", "dress"] as const,
  color: ["gray", "red", "blue", "green", "purple"] as const,
};

export const SUPPORTED_LANGUAGES = ["ru", "en"] as const;
export const MIN_STORY_TURNS = 4;
export const DEFAULT_STORY_TURNS = 9;
export const MAX_STORY_TURNS = 14;
export const SCENE_VISUAL_IDS = [
  "room",
  "corridor",
  "office",
  "infirmary",
  "basement",
  "dorm",
  "laboratory",
  "archive",
  "storage",
  "classroom",
  "canteen",
  "rooftop",
  "chapel",
  "server_room",
  "library",
  "roulette",
  "puzzle",
] as const;

const idSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9_-]+$/, "ID must contain only lowercase English letters, numbers, underscores, or dashes.");

const portraitSchema = z
  .object({
    hair: z.enum(PORTRAIT_PARTS.hair),
    face: z.enum(PORTRAIT_PARTS.face),
    body: z.enum(PORTRAIT_PARTS.body),
    color: z.enum(PORTRAIT_PARTS.color),
  })
  .strict();

const dialogueSchema = z
  .object({
    speakerId: idSchema,
    speakerName: z.string().min(1),
    text: z.string().min(1),
    emotion: z.enum([
      "neutral",
      "happy",
      "angry",
      "sad",
      "afraid",
      "suspicious",
    ]),
  })
  .strict();

const availableItemSchema = z
  .object({
    itemId: idSchema,
    visibleName: z.string().min(1),
    description: z.string().min(1),
  })
  .strict();

const miniGameSchema = z
  .object({
    type: z.enum(["none", "hidden_object", "roulette", "puzzle"]),
    description: z.string(),
    rules: z.string(),
    options: z.array(z.string()),
    correctAnswer: z.string().nullable(),
    rewardItemId: idSchema.nullable(),
    damageOnFail: z.number().int().min(0).max(100),
  })
  .strict();

const choiceSchema = z
  .object({
    id: idSchema,
    text: z.string().min(1),
    risk: z.enum(["low", "medium", "high"]),
    hint: z.string().min(1),
  })
  .strict();

const statePatchSchema = z
  .object({
    hpDelta: z.number().int().min(-100).max(100),
    coinsDelta: z.number().int().min(-1000).max(1000),
    addItems: z.array(idSchema),
    removeItems: z.array(idSchema),
    setFlags: z.array(z.string().min(1)),
  })
  .strict();

const summaryUpdateSchema = z
  .object({
    latestActionSummary: z.string().min(1),
    compressedHistory: z.string().min(1),
    heroCurrentDescription: z.string().min(1),
  })
  .strict();

const finalSchema = z
  .object({
    isFinal: z.boolean(),
    endingTitle: z.string().nullable(),
    endingDescription: z.string().nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.isFinal && (!value.endingTitle || !value.endingDescription)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Final scenes must include endingTitle and endingDescription.",
      });
    }
  });

export const gameSceneSchema = z
  .object({
    sceneId: idSchema,
    mode: z.enum(["visual_novel", "hidden_object", "casino", "puzzle"]),
    title: z.string().min(1),
    location: z.string().min(1),
    description: z.string().min(1),
    visualAssetId: z.enum(SCENE_VISUAL_IDS).default("room"),
    asciiScene: z.string().min(1),
    dialogues: z.array(dialogueSchema),
    availableItems: z.array(availableItemSchema),
    miniGame: miniGameSchema,
    choices: z.array(choiceSchema).min(0).max(4),
    statePatch: statePatchSchema,
    summaryUpdate: summaryUpdateSchema,
    final: finalSchema,
  })
  .strict()
  .superRefine((scene, ctx) => {
    if (!scene.final.isFinal && (scene.choices.length < 2 || scene.choices.length > 4)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Non-final scenes must contain between 2 and 4 choices.",
        path: ["choices"],
      });
    }

    if (scene.final.isFinal && scene.choices.length !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Final scenes must not contain choices.",
        path: ["choices"],
      });
    }

    if (scene.mode === "visual_novel" && scene.miniGame.type !== "none") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Visual novel mode must use miniGame.type = none.",
        path: ["miniGame", "type"],
      });
    }

    if (scene.mode === "hidden_object" && scene.miniGame.type !== "hidden_object") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hidden object scenes must use hidden_object mini-game.",
        path: ["miniGame", "type"],
      });
    }

    if (scene.mode === "casino" && scene.miniGame.type !== "roulette") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Casino scenes must use roulette mini-game.",
        path: ["miniGame", "type"],
      });
    }

    if (scene.mode === "puzzle" && scene.miniGame.type !== "puzzle") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Puzzle scenes must use puzzle mini-game.",
        path: ["miniGame", "type"],
      });
    }
  });

const heroSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    description: z.string().min(1),
    personality: z.string().min(1),
    hp: z.number().int().min(0).max(100),
    maxHp: z.number().int().min(1).max(100),
    portrait: portraitSchema,
  })
  .strict()
  .superRefine((hero, ctx) => {
    if (hero.hp > hero.maxHp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hero hp cannot exceed maxHp.",
        path: ["hp"],
      });
    }
  });

const characterSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    role: z.string().min(1),
    description: z.string().min(1),
    personality: z.string().min(1),
    relationshipToHero: z.string().min(1),
    hiddenMotive: z.string().min(1),
    isTrusted: z.boolean(),
    portrait: portraitSchema,
  })
  .strict();

const itemSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    description: z.string().min(1),
    type: z.enum(["heal", "damage", "key", "clue", "money", "misc"]),
    effect: z
      .object({
        hp: z.number().int().min(-100).max(100),
        coins: z.number().int().min(-1000).max(1000),
        flags: z.array(z.string().min(1)),
      })
      .strict(),
  })
  .strict();

export const gameConfigSchema = z
  .object({
    title: z.string().min(1),
    genre: z.string().min(1),
    tone: z.string().min(1),
    setting: z.string().min(1),
    mainGoal: z.string().min(1),
    hero: heroSchema,
    characters: z.array(characterSchema).min(1),
    items: z.array(itemSchema),
    worldRules: z.array(z.string().min(1)).min(1),
    startScene: gameSceneSchema,
  })
  .strict();

export const gameStateSchema = z
  .object({
    gameConfig: gameConfigSchema,
    currentScene: gameSceneSchema,
    language: z.enum(SUPPORTED_LANGUAGES).default("ru"),
    turnCount: z.number().int().min(0).max(99).default(0),
    maxTurns: z
      .number()
      .int()
      .min(MIN_STORY_TURNS)
      .max(MAX_STORY_TURNS)
      .default(DEFAULT_STORY_TURNS),
    heroHp: z.number().int().min(0).max(100),
    coins: z.number().int().min(0).max(100000),
    inventory: z.array(idSchema),
    flags: z.array(z.string().min(1)),
    compressedHistory: z.string(),
    latestActions: z.array(z.string().min(1)),
    heroCurrentDescription: z.string().min(1),
    isFinal: z.boolean(),
  })
  .strict();

export const generateGameRequestSchema = z
  .object({
    prompt: z.string().min(10).max(1200),
    language: z.enum(SUPPORTED_LANGUAGES).default("ru"),
    maxTurns: z
      .number()
      .int()
      .min(MIN_STORY_TURNS)
      .max(MAX_STORY_TURNS)
      .default(DEFAULT_STORY_TURNS),
  })
  .strict();

export const nextSceneRequestSchema = z
  .object({
    gameConfig: gameConfigSchema,
    gameState: gameStateSchema,
    choiceId: idSchema,
  })
  .strict();

export type Portrait = z.infer<typeof portraitSchema>;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type SceneVisualId = (typeof SCENE_VISUAL_IDS)[number];
export type GameScene = z.infer<typeof gameSceneSchema>;
export type GameConfig = z.infer<typeof gameConfigSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
export type NextSceneRequest = z.infer<typeof nextSceneRequestSchema>;
