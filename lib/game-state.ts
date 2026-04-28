import {
  DEFAULT_STORY_TURNS,
  gameStateSchema,
  type GameConfig,
  type GameScene,
  type GameState,
  type SupportedLanguage,
} from "@/lib/schemas";

export const GAME_STATE_STORAGE_KEY = "ainovell.bostoncrew.ru:game-state";

type MiniGamePatch = {
  latestAction: string;
  hpDelta?: number;
  coinsDelta?: number;
  addItemIds?: string[];
  removeItemIds?: string[];
  addFlags?: string[];
};

type ChoiceRisk = GameScene["choices"][number]["risk"];
type ChoiceRiskStatus = "safe" | "wounded" | "fatal";

type ChoiceRiskRule = {
  fatalChance: number;
  woundChance: number;
  minDamage: number;
  maxDamage: number;
};

export type ChoiceRiskOutcome = {
  status: ChoiceRiskStatus;
  hpDelta: number;
  roll: number;
  latestAction: string;
  statusText: string;
  flag: string;
};

export const CHOICE_RISK_RULES: Record<ChoiceRisk, ChoiceRiskRule> = {
  low: {
    fatalChance: 0,
    woundChance: 0.16,
    minDamage: 4,
    maxDamage: 10,
  },
  medium: {
    fatalChance: 0.12,
    woundChance: 0.42,
    minDamage: 12,
    maxDamage: 28,
  },
  high: {
    fatalChance: 0.58,
    woundChance: 0.3,
    minDamage: 35,
    maxDamage: 70,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choiceLabel(choice: GameScene["choices"][number]) {
  return choice.text.replace(/\s+/g, " ").trim();
}

export function rollChoiceRisk(
  state: GameState,
  choice: GameScene["choices"][number],
): ChoiceRiskOutcome {
  const rule = CHOICE_RISK_RULES[choice.risk];
  const roll = Math.random();
  const isRussian = state.language === "ru";
  const choiceText = choiceLabel(choice);

  if (roll < rule.fatalChance) {
    return {
      status: "fatal",
      hpDelta: -999,
      roll,
      flag: `choice_risk_${choice.id}_fatal`,
      latestAction: isRussian
        ? `Выбор "${choiceText}" оказался смертельным. Герой погиб из-за риска.`
        : `The choice "${choiceText}" became fatal. The hero died because of the risk.`,
      statusText: isRussian
        ? "Риск сработал фатально: герой погиб."
        : "Risk roll was fatal: the hero died.",
    };
  }

  if (roll < rule.fatalChance + rule.woundChance) {
    const damage = randomInt(rule.minDamage, rule.maxDamage);

    return {
      status: "wounded",
      hpDelta: -damage,
      roll,
      flag: `choice_risk_${choice.id}_wounded`,
      latestAction: isRussian
        ? `Выбор "${choiceText}" ранил героя: -${damage} HP.`
        : `The choice "${choiceText}" wounded the hero: -${damage} HP.`,
      statusText: isRussian
        ? `Риск сработал: герой потерял ${damage} HP.`
        : `Risk roll hit: the hero lost ${damage} HP.`,
    };
  }

  return {
    status: "safe",
    hpDelta: 0,
    roll,
    flag: `choice_risk_${choice.id}_safe`,
    latestAction: isRussian
      ? `Герой пережил рискованный выбор "${choiceText}" без потерь.`
      : `The hero survived the risky choice "${choiceText}" without losses.`,
    statusText: isRussian
      ? "Риск пройден без потерь."
      : "Risk roll passed without losses.",
  };
}

export function applyChoiceRiskToGameState(
  state: GameState,
  outcome: ChoiceRiskOutcome,
): GameState {
  return applyMiniGamePatch(state, {
    latestAction: outcome.latestAction,
    hpDelta: outcome.hpDelta,
    addFlags: [outcome.flag, `choice_risk_${outcome.status}`],
  });
}

export function applySceneToGameState(
  previousState: GameState,
  nextScene: GameScene,
): GameState {
  const nextTurnCount = previousState.turnCount + 1;
  const reachedTurnLimit = nextTurnCount >= previousState.maxTurns;
  const resolvedScene =
    reachedTurnLimit && !nextScene.final.isFinal
      ? {
          ...nextScene,
          choices: [],
          final: {
            isFinal: true,
            endingTitle:
              previousState.language === "ru"
                ? "Конец главы"
                : "End of Chapter",
            endingDescription:
              nextScene.summaryUpdate.compressedHistory ||
              nextScene.summaryUpdate.latestActionSummary,
          },
        }
      : nextScene;
  const heroMaxHp = previousState.gameConfig.hero.maxHp;
  const nextHp = clamp(
    previousState.heroHp + resolvedScene.statePatch.hpDelta,
    0,
    heroMaxHp,
  );
  const nextCoins = clamp(
    previousState.coins + resolvedScene.statePatch.coinsDelta,
    0,
    100000,
  );

  const inventoryAfterAdd = unique([
    ...previousState.inventory,
    ...resolvedScene.statePatch.addItems,
  ]);
  const nextInventory = inventoryAfterAdd.filter(
    (itemId) => !resolvedScene.statePatch.removeItems.includes(itemId),
  );
  const nextFlags = unique([
    ...previousState.flags,
    ...resolvedScene.statePatch.setFlags,
  ]);

  const nextLatestActions = [
    ...previousState.latestActions,
    resolvedScene.summaryUpdate.latestActionSummary,
  ].slice(-12);

  return {
    ...previousState,
    currentScene: resolvedScene,
    turnCount: nextTurnCount,
    heroHp: nextHp,
    coins: nextCoins,
    inventory: nextInventory,
    flags: nextFlags,
    compressedHistory: resolvedScene.summaryUpdate.compressedHistory,
    latestActions: nextLatestActions,
    heroCurrentDescription: resolvedScene.summaryUpdate.heroCurrentDescription,
    isFinal: resolvedScene.final.isFinal,
  };
}

export function applyMiniGamePatch(
  state: GameState,
  patch: MiniGamePatch,
): GameState {
  const nextHp = clamp(
    state.heroHp + (patch.hpDelta ?? 0),
    0,
    state.gameConfig.hero.maxHp,
  );
  const isDead = nextHp <= 0;
  const deathScene: GameScene = isDead
    ? {
        ...state.currentScene,
        choices: [],
        summaryUpdate: {
          latestActionSummary: patch.latestAction,
          compressedHistory:
            state.compressedHistory || state.currentScene.summaryUpdate.compressedHistory,
          heroCurrentDescription:
            state.language === "ru"
              ? "Герой погиб после рискованного решения."
              : "The hero died after a risky decision.",
        },
        final: {
          isFinal: true,
          endingTitle: state.language === "ru" ? "Смертельный риск" : "Fatal Risk",
          endingDescription:
            state.language === "ru"
              ? "Решение оказалось последним: история завершилась мгновенно."
              : "The decision became the last one: the story ended immediately.",
        },
      }
    : state.currentScene;

  const nextState: GameState = {
    ...state,
    currentScene: deathScene,
    heroHp: nextHp,
    coins: clamp(state.coins + (patch.coinsDelta ?? 0), 0, 100000),
    inventory: unique([
      ...state.inventory,
      ...(patch.addItemIds ?? []),
    ]).filter((itemId) => !(patch.removeItemIds ?? []).includes(itemId)),
    flags: unique([...state.flags, ...(patch.addFlags ?? [])]),
    latestActions: [...state.latestActions, patch.latestAction].slice(-12),
    heroCurrentDescription: deathScene.summaryUpdate.heroCurrentDescription,
    isFinal: isDead ? true : state.isFinal,
  };

  return nextState;
}

export function createInitialGameState(
  gameConfig: GameConfig,
  options?: {
    language?: SupportedLanguage;
    maxTurns?: number;
  },
): GameState {
  const baseState: GameState = {
    gameConfig,
    currentScene: gameConfig.startScene,
    language: options?.language ?? "ru",
    turnCount: -1,
    maxTurns: options?.maxTurns ?? DEFAULT_STORY_TURNS,
    heroHp: gameConfig.hero.hp,
    coins: 0,
    inventory: [],
    flags: [],
    compressedHistory: "",
    latestActions: [],
    heroCurrentDescription: gameConfig.hero.description,
    isFinal: false,
  };

  return applySceneToGameState(baseState, gameConfig.startScene);
}

export function saveGameState(gameState: GameState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    GAME_STATE_STORAGE_KEY,
    JSON.stringify(gameState),
  );
}

export function loadGameState() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(GAME_STATE_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return gameStateSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearGameState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(GAME_STATE_STORAGE_KEY);
}
