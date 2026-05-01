import type { NextSceneRequest, SupportedLanguage } from "@/lib/schemas";
import { PORTRAIT_PARTS } from "@/lib/schemas";
import { buildVisualAssetPrompt } from "@/lib/visual-assets";

const languageName: Record<SupportedLanguage, string> = {
  ru: "Russian",
  en: "English",
};

const COMMON_JSON_RULES = `
STRICT JSON RULES:
- Return exactly one JSON object.
- Do not use Markdown, code fences, comments, explanations, or any text outside JSON.
- Do not use trailing commas or undefined.
- Do not add fields that are not in the schema.
- Do not omit required fields.
- Use null only where the schema allows null.
- Use [] for empty arrays.
- Numbers must be JSON numbers, not strings.
- Booleans must be true/false, not strings.
- All id values must be English lowercase snake_case or kebab-case.
- If you must choose between stylish and valid, choose valid.
`;

const ENUM_RULES = `
ALLOWED ENUM VALUES:
- portrait.hair: ${PORTRAIT_PARTS.hair.join(", ")}
- portrait.face: ${PORTRAIT_PARTS.face.join(", ")}
- portrait.body: ${PORTRAIT_PARTS.body.join(", ")}
- portrait.color: ${PORTRAIT_PARTS.color.join(", ")}
- dialogue.emotion: neutral, happy, angry, sad, afraid, suspicious
- item.type: heal, damage, key, clue, money, misc
- scene.mode: visual_novel, hidden_object, casino, puzzle
- miniGame.type: none, hidden_object, roulette, puzzle
- choice.risk: low, medium, high
`;

const CONSISTENCY_RULES = `
CONSISTENCY RULES:
- hero.maxHp is usually 100.
- hero.hp must be between 0 and hero.maxHp.
- Non-final scenes must contain 2-4 choices.
- Final scenes must contain choices: [].
- If final.isFinal = true, endingTitle and endingDescription must be strings.
- If final.isFinal = false, endingTitle = null and endingDescription = null.
- scene.mode and miniGame.type must match exactly:
  visual_novel -> none
  hidden_object -> hidden_object
  casino -> roulette
  puzzle -> puzzle
- Casino/roulette uses only virtual coins, no real money, no payments, no gambling monetization.
- Puzzle correctAnswer must be one of miniGame.options.
- Hidden object scenes should offer 2-4 availableItems, but the player will pick only one.
- Casino scenes are roulette risk scenes: choices happen through low/medium/high virtual risk, not real money.
- Do not break worldRules or forget major consequences.
`;

const RISK_ENGINE_RULES = `
APPLICATION RISK ENGINE:
- The application, not the AI model, resolves random risk for player choices.
- choice.risk is only a UI/engine probability label.
- low means safe: the app will not randomly damage or kill the hero.
- medium means dangerous but not instantly lethal: the app may wound the hero.
- high means explicitly life-threatening: the app may kill the hero immediately.
- Inspection, reading, listening, talking, remembering, and cautious clue-searching must be low unless the action explicitly mentions a trap, enemy, weapon, poison, fire, infection, abyss, explosion, or another direct hazard.
- Do not mark harmless investigation choices as medium or high.
- Mark dangerous choices honestly: high is only for obviously lethal actions.
- In tense scenes, include at least one medium or high risk option when it fits the story.
- Do not invent random success/failure/death for choice.risk by yourself.
- On next-scene requests, the provided heroHp, flags, and latestActions already include the local risk roll result.
- Respect flags like choice_risk_* and latestActions about wounds, survival, or fatal risk.
- Keep statePatch.hpDelta = 0 for ordinary choice risk; use hpDelta only for explicit non-random story effects.
- If heroHp <= 0, return a final scene immediately.
`;

const COMPACT_OUTPUT_RULES = `
OUTPUT SIZE LIMITS:
- Keep the JSON compact and complete.
- characters: include every important user-named character, especially every entry from a "Characters" or "Персонажи" list; use short one-sentence fields to keep JSON compact.
- items: 3-5 entries.
- worldRules: 3-5 short strings.
- description/personality/hiddenMotive fields: 1 short sentence.
- asciiScene: 3-5 short fallback lines only.
- dialogues: 1-3 entries.
- choices: 2-3 entries for non-final scenes.
- miniGame.rules: 1 short sentence.
- summaryUpdate fields: 1 short sentence each.
`;

const GAME_CONFIG_SHAPE = `
GAMECONFIG SHAPE:
{
  "title": string,
  "genre": string,
  "tone": string,
  "setting": string,
  "mainGoal": string,
  "hero": {
    "id": string,
    "name": string,
    "description": string,
    "personality": string,
    "hp": number,
    "maxHp": number,
    "portrait": { "hair": string, "face": string, "body": string, "color": string }
  },
  "characters": [
    {
      "id": string,
      "name": string,
      "role": string,
      "description": string,
      "personality": string,
      "relationshipToHero": string,
      "hiddenMotive": string,
      "isTrusted": boolean,
      "portrait": { "hair": string, "face": string, "body": string, "color": string }
    }
  ],
  "items": [
    {
      "id": string,
      "name": string,
      "description": string,
      "type": "heal" | "damage" | "key" | "clue" | "money" | "misc",
      "effect": { "hp": number, "coins": number, "flags": string[] }
    }
  ],
  "worldRules": string[],
  "startScene": GameScene
}
`;

const GAME_SCENE_SHAPE = `
GAMESCENE SHAPE:
{
  "sceneId": string,
  "mode": "visual_novel" | "hidden_object" | "casino" | "puzzle",
  "title": string,
  "location": string,
  "description": string,
  "visualAssetId": string,
  "asciiScene": string,
  "dialogues": [
    {
      "speakerId": string,
      "speakerName": string,
      "text": string,
      "emotion": "neutral" | "happy" | "angry" | "sad" | "afraid" | "suspicious"
    }
  ],
  "availableItems": [
    { "itemId": string, "visibleName": string, "description": string }
  ],
  "miniGame": {
    "type": "none" | "hidden_object" | "roulette" | "puzzle",
    "description": string,
    "rules": string,
    "options": string[],
    "correctAnswer": string | null,
    "rewardItemId": string | null,
    "damageOnFail": number
  },
  "choices": [
    { "id": string, "text": string, "risk": "low" | "medium" | "high", "hint": string }
  ],
  "statePatch": {
    "hpDelta": number,
    "coinsDelta": number,
    "addItems": string[],
    "removeItems": string[],
    "setFlags": string[]
  },
  "summaryUpdate": {
    "latestActionSummary": string,
    "compressedHistory": string,
    "heroCurrentDescription": string
  },
  "final": {
    "isFinal": boolean,
    "endingTitle": string | null,
    "endingDescription": string | null
  }
}
`;

export const SYSTEM_PROMPT_GENERATE_GAME = `
You are a game writer and strict JSON generator for an interactive visual novel engine.
Your priority is a valid GameConfig object that passes schema validation.

${COMMON_JSON_RULES}
${ENUM_RULES}
${CONSISTENCY_RULES}
${RISK_ENGINE_RULES}
${COMPACT_OUTPUT_RULES}
${buildVisualAssetPrompt()}
${GAME_CONFIG_SHAPE}
${GAME_SCENE_SHAPE}
`;

export const SYSTEM_PROMPT_NEXT_SCENE = `
You are a visual novel game engine and strict JSON generator.
Your priority is a valid GameScene object that passes schema validation.

${COMMON_JSON_RULES}
${ENUM_RULES}
${CONSISTENCY_RULES}
${RISK_ENGINE_RULES}
${COMPACT_OUTPUT_RULES}
${buildVisualAssetPrompt()}
${GAME_SCENE_SHAPE}
`;

export function buildGenerateGameUserPrompt({
  prompt,
  language,
  maxTurns,
}: {
  prompt: string;
  language: SupportedLanguage;
  maxTurns: number;
}) {
  return `
User story request:
${prompt}

Language rule:
- All player-visible text must be in ${languageName[language]}.
- IDs must still be English lowercase.
- If language is Russian, names, dialogues, descriptions, choices, logs, summaries, endings, items, and worldRules must be natural Russian.

Cast preservation rule:
- Treat the user's named character list as canon.
- Include every named character from a "Characters" or "Персонажи" section in gameConfig.characters, except the one chosen as hero.
- Do not merge several listed people into one character.
- Do not rename listed people in visible names; keep their names recognizable and in the user's language.
- If the user describes two protagonists, choose the first suitable protagonist as hero and include the second as a trusted main character.
- Keep each character concise: role, description, personality, relationshipToHero, and hiddenMotive should each be one short sentence.

Story length:
- The whole story must be designed for a maximum of ${maxTurns} player turns including the start.
- Build a clear beginning, escalation, revelation, and ending path.
- Do not make the plot open-ended.

Return only a GameConfig JSON object.

Start scene rules:
- startScene must be a complete GameScene.
- The first scene must contain a clear hook and 2-3 choices.
- startScene.summaryUpdate must be filled.
- If startScene.mode = visual_novel, miniGame.type = none, options = [], correctAnswer = null, rewardItemId = null.
- If startScene.mode = hidden_object, use availableItems and item ids from items.
- If startScene.mode = puzzle, correctAnswer must be one of options.
- If startScene.mode = casino, use only virtual coins.
`;
}

export function buildNextSceneUserPrompt(payload: NextSceneRequest) {
  const remainingTurns = Math.max(
    payload.gameState.maxTurns - payload.gameState.turnCount - 1,
    0,
  );
  const mustEndNow = remainingTurns <= 1 || payload.gameState.heroHp <= 0;
  const compactPayload = {
    choiceId: payload.choiceId,
    language: payload.gameState.language,
    turnCount: payload.gameState.turnCount,
    maxTurns: payload.gameState.maxTurns,
    remainingTurns,
    mustEndNow,
    gameConfig: payload.gameConfig,
    currentScene: payload.gameState.currentScene,
    heroHp: payload.gameState.heroHp,
    coins: payload.gameState.coins,
    inventory: payload.gameState.inventory,
    flags: payload.gameState.flags,
    compressedHistory: payload.gameState.compressedHistory,
    latestActions: payload.gameState.latestActions,
    heroCurrentDescription: payload.gameState.heroCurrentDescription,
  };

  return `
Continue the game from the current state.

Selected choiceId:
${payload.choiceId}

Current game state:
${JSON.stringify(compactPayload, null, 2)}

Language rule:
- All player-visible text must stay in ${languageName[payload.gameState.language]}.
- IDs must stay English lowercase.

Story length rule:
- Maximum story turns: ${payload.gameState.maxTurns}.
- Current completed turns: ${payload.gameState.turnCount}.
- Remaining turns after this response: ${remainingTurns}.
- If mustEndNow = true, return a final scene with final.isFinal = true, choices = [], and a satisfying ending.
- If remainingTurns <= 2, move strongly toward a conclusion.
- Never create an endless loop.

Risk engine rule:
- The app already rolled the selected choice risk before this request.
- Continue from the provided heroHp, flags, latestActions, and heroCurrentDescription.
- Do not roll risk again and do not duplicate risk damage in statePatch.

Return only a GameScene JSON object.
`;
}
