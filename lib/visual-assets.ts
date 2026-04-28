import {
  SCENE_VISUAL_IDS,
  type GameConfig,
  type GameScene,
  type SceneVisualId,
} from "@/lib/schemas";

type SceneAsset = {
  id: SceneVisualId;
  label: string;
  path: string;
  bestFor: string;
};

export const SCENE_ASSETS: Record<SceneVisualId, SceneAsset> = {
  room: {
    id: "room",
    label: "Комната",
    path: "/assets/svg/scene-room.svg",
    bestFor: "neutral rooms, apartments, quiet conversations",
  },
  corridor: {
    id: "corridor",
    label: "Коридор",
    path: "/assets/svg/scene-corridor.svg",
    bestFor: "movement, patrols, chases, hallway tension",
  },
  office: {
    id: "office",
    label: "Кабинет",
    path: "/assets/svg/scene-office.svg",
    bestFor: "documents, interrogations, secrets, authority figures",
  },
  infirmary: {
    id: "infirmary",
    label: "Медпункт",
    path: "/assets/svg/scene-infirmary.svg",
    bestFor: "healing, infection, medical horror",
  },
  basement: {
    id: "basement",
    label: "Подвал",
    path: "/assets/svg/scene-basement.svg",
    bestFor: "dark reveals, generators, locked doors",
  },
  dorm: {
    id: "dorm",
    label: "Общежитие",
    path: "/assets/svg/scene-dorm.svg",
    bestFor: "personal spaces, betrayal, belongings",
  },
  laboratory: {
    id: "laboratory",
    label: "Лаборатория",
    path: "/assets/svg/scene-laboratory.svg",
    bestFor: "experiments, outbreak source, strange devices",
  },
  archive: {
    id: "archive",
    label: "Архив",
    path: "/assets/svg/scene-archive.svg",
    bestFor: "files, clues, hidden history",
  },
  storage: {
    id: "storage",
    label: "Склад",
    path: "/assets/svg/scene-storage.svg",
    bestFor: "hidden object scenes and supplies",
  },
  classroom: {
    id: "classroom",
    label: "Аудитория",
    path: "/assets/svg/scene-classroom.svg",
    bestFor: "lectures, exams, old notes, groups of students",
  },
  canteen: {
    id: "canteen",
    label: "Столовая",
    path: "/assets/svg/scene-canteen.svg",
    bestFor: "crowds, rumors, food, suspicious meetings",
  },
  rooftop: {
    id: "rooftop",
    label: "Крыша",
    path: "/assets/svg/scene-rooftop.svg",
    bestFor: "escape, wind, final confrontations, city view",
  },
  chapel: {
    id: "chapel",
    label: "Часовня",
    path: "/assets/svg/scene-chapel.svg",
    bestFor: "rituals, guilt, quiet dread, symbols",
  },
  server_room: {
    id: "server_room",
    label: "Серверная",
    path: "/assets/svg/scene-server-room.svg",
    bestFor: "hacking, cameras, alarms, data",
  },
  library: {
    id: "library",
    label: "Библиотека",
    path: "/assets/svg/scene-library.svg",
    bestFor: "research, old books, occult or academic clues",
  },
  roulette: {
    id: "roulette",
    label: "Рулетка",
    path: "/assets/svg/scene-roulette.svg",
    bestFor: "virtual risk and roulette scenes",
  },
  puzzle: {
    id: "puzzle",
    label: "Панель головоломки",
    path: "/assets/svg/scene-puzzle.svg",
    bestFor: "code locks, symbols, terminals",
  },
};

export const DEFAULT_SCENE_BY_MODE: Record<GameScene["mode"], SceneVisualId> = {
  visual_novel: "room",
  hidden_object: "storage",
  casino: "roulette",
  puzzle: "puzzle",
};

export const ITEM_SPRITES = {
  heal: {
    id: "medkit",
    label: "Аптечка",
    path: "/assets/svg/item-medkit.svg",
  },
  damage: {
    id: "blade",
    label: "Опасный предмет",
    path: "/assets/svg/item-blade.svg",
  },
  key: {
    id: "key",
    label: "Ключ",
    path: "/assets/svg/item-key.svg",
  },
  clue: {
    id: "document",
    label: "Улика",
    path: "/assets/svg/item-document.svg",
  },
  money: {
    id: "coin",
    label: "Монеты",
    path: "/assets/svg/item-coin.svg",
  },
  misc: {
    id: "artifact",
    label: "Артефакт",
    path: "/assets/svg/item-artifact.svg",
  },
} as const satisfies Record<
  GameConfig["items"][number]["type"],
  { id: string; label: string; path: string }
>;

export function getSceneAsset(scene: GameScene) {
  return (
    SCENE_ASSETS[scene.visualAssetId] ??
    SCENE_ASSETS[DEFAULT_SCENE_BY_MODE[scene.mode]]
  );
}

export function getItemSprite(
  gameConfig: GameConfig,
  itemId: string,
): (typeof ITEM_SPRITES)[keyof typeof ITEM_SPRITES] {
  const item = gameConfig.items.find((candidate) => candidate.id === itemId);
  return ITEM_SPRITES[item?.type ?? "misc"];
}

export function buildVisualAssetPrompt() {
  const scenes = SCENE_VISUAL_IDS.map((id) => {
    const asset = SCENE_ASSETS[id];
    return `${asset.id}: ${asset.label}, best for ${asset.bestFor}`;
  }).join("; ");
  const items = Object.entries(ITEM_SPRITES)
    .map(([type, asset]) => `${type}: ${asset.id} (${asset.label})`)
    .join("; ");

  return `
VISUAL ASSET HINTS:
- Every GameScene must include visualAssetId.
- Allowed visualAssetId values: ${SCENE_VISUAL_IDS.join(", ")}.
- Scene SVG library: ${scenes}.
- The frontend renders item SVG icons by item.type: ${items}.
- Choose the visualAssetId that best matches the location and mood.
- asciiScene is kept only as fallback text; make it short.
`;
}
