"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameConfig, GameScene } from "@/lib/schemas";

type MiniGamePanelProps = {
  scene: GameScene;
  gameConfig: GameConfig;
  isLoading?: boolean;
  onApplyResult: (payload: {
    latestAction: string;
    hpDelta?: number;
    coinsDelta?: number;
    addItemIds?: string[];
    addFlags?: string[];
  }) => void;
  onContinue: (choiceId: string) => void;
};

const riskOptions = [
  {
    id: "low",
    label: "Тихий риск",
    winChance: 0.68,
    winCoins: 6,
    damageOnFail: 12,
  },
  {
    id: "medium",
    label: "Опасный риск",
    winChance: 0.46,
    winCoins: 18,
    damageOnFail: 38,
  },
  {
    id: "fatal",
    label: "Смертельный риск",
    winChance: 0.24,
    winCoins: 35,
    damageOnFail: 999,
  },
] as const;

export function MiniGamePanel({
  scene,
  gameConfig,
  isLoading = false,
  onApplyResult,
  onContinue,
}: MiniGamePanelProps) {
  const [resolvedChoiceId, setResolvedChoiceId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const riskRewardItem = useMemo(() => {
    if (scene.miniGame.rewardItemId) {
      return scene.miniGame.rewardItemId;
    }

    return (
      gameConfig.items.find((item) => item.type === "key")?.id ??
      gameConfig.items.find((item) => item.type === "clue")?.id ??
      gameConfig.items.find((item) => item.type === "misc")?.id ??
      null
    );
  }, [gameConfig.items, scene.miniGame.rewardItemId]);

  useEffect(() => {
    setResolvedChoiceId(null);
    setSelectedItemId(null);
    setMessage(null);
  }, [scene.sceneId]);

  if (scene.miniGame.type === "none") {
    return null;
  }

  const isResolved = Boolean(resolvedChoiceId);

  function itemName(itemId: string | null) {
    if (!itemId) {
      return null;
    }

    return gameConfig.items.find((item) => item.id === itemId)?.name ?? itemId;
  }

  function handleHiddenObject(itemId: string, visibleName: string) {
    if (isResolved) {
      return;
    }

    const rewardName = itemName(itemId) ?? visibleName;
    const choiceId = `take_${itemId}`;
    setSelectedItemId(itemId);
    setResolvedChoiceId(choiceId);
    setMessage(`Выбран предмет: ${rewardName}. История продолжится с этим выбором.`);
    onApplyResult({
      latestAction: `Герой выбрал предмет "${rewardName}".`,
      addItemIds: [itemId],
      addFlags: [`selected_${scene.sceneId}_${itemId}`],
    });
  }

  function handleRouletteRisk(risk: (typeof riskOptions)[number]) {
    if (isResolved) {
      return;
    }

    const win = Math.random() < risk.winChance;
    const rewardName = itemName(riskRewardItem);
    const choiceId = `risk_${risk.id}_${win ? "win" : "death"}`;
    setResolvedChoiceId(choiceId);

    if (win) {
      setMessage(
        rewardName
          ? `${risk.label}: удача. Получено "${rewardName}" и +${risk.winCoins} coins.`
          : `${risk.label}: удача. Получено +${risk.winCoins} coins.`,
      );
      onApplyResult({
        latestAction: rewardName
          ? `Герой рискнул и получил "${rewardName}".`
          : `Герой рискнул и выиграл ${risk.winCoins} coins.`,
        coinsDelta: risk.winCoins,
        addItemIds: riskRewardItem ? [riskRewardItem] : [],
        addFlags: [`risk_${scene.sceneId}_${risk.id}_win`],
      });
      return;
    }

    setMessage(
      risk.id === "fatal"
        ? `${risk.label}: провал. Герой погибает.`
        : `${risk.label}: провал. Урон ${risk.damageOnFail}.`,
    );
    onApplyResult({
      latestAction:
        risk.id === "fatal"
          ? "Герой пошёл ва-банк и смертельно ошибся."
          : `Герой рискнул и получил ${risk.damageOnFail} урона.`,
      hpDelta: -risk.damageOnFail,
      addFlags: [`risk_${scene.sceneId}_${risk.id}_fail`],
    });
  }

  function handlePuzzle(answer: string) {
    if (isResolved) {
      return;
    }

    const isCorrect = answer === scene.miniGame.correctAnswer;
    const rewardName = itemName(scene.miniGame.rewardItemId);
    const choiceId = `puzzle_${isCorrect ? "success" : "fail"}`;
    setResolvedChoiceId(choiceId);

    if (isCorrect) {
      setMessage(rewardName ? `Верно. Получено: ${rewardName}` : "Верно.");
      onApplyResult({
        latestAction: rewardName
          ? `Герой решил головоломку и получил "${rewardName}".`
          : "Герой решил головоломку.",
        addItemIds: scene.miniGame.rewardItemId
          ? [scene.miniGame.rewardItemId]
          : [],
        addFlags: [`puzzle_${scene.sceneId}_solved`],
      });
      return;
    }

    setMessage(`Неверно. Урон: ${scene.miniGame.damageOnFail}`);
    onApplyResult({
      latestAction: `Герой ошибся в головоломке и получил ${scene.miniGame.damageOnFail} урона.`,
      hpDelta: -scene.miniGame.damageOnFail,
      addFlags: [`puzzle_${scene.sceneId}_failed`],
    });
  }

  return (
    <div className={scene.miniGame.type === "roulette" ? "win95-window risk-window" : "win95-panel"}>
      {scene.miniGame.type === "roulette" ? (
        <div className="win95-titlebar">
          <span>Risk.exe</span>
          <div className="win95-titlebar__buttons">
            <span className="win95-control">!</span>
          </div>
        </div>
      ) : null}
      <div className={scene.miniGame.type === "roulette" ? "win95-content scroll-thin" : ""}>
        <strong>
          {scene.miniGame.type === "roulette" ? "Окно риска" : "Мини-игра"}
        </strong>
        <p className="mt-1">{scene.miniGame.description}</p>
        <p>{scene.miniGame.rules}</p>

        {scene.miniGame.type === "hidden_object" ? (
          <div className="mt-2 grid gap-1">
            {scene.availableItems.map((item) => (
              <button
                key={item.itemId}
                type="button"
                disabled={isResolved}
                aria-pressed={selectedItemId === item.itemId}
                onClick={() => handleHiddenObject(item.itemId, item.visibleName)}
                className="win95-btn !justify-start"
              >
                {item.visibleName}
              </button>
            ))}
          </div>
        ) : null}

        {scene.miniGame.type === "roulette" ? (
          <div className="mt-2 grid gap-1">
            {riskOptions.map((risk) => (
              <button
                key={risk.id}
                type="button"
                disabled={isResolved}
                onClick={() => handleRouletteRisk(risk)}
                className="win95-btn win95-btn--choice w-full !justify-start text-left"
              >
                <span className="min-w-0">
                  <span className="win95-choice-text font-bold">{risk.label}</span>
                  <span className="win95-choice-hint">
                    шанс {Math.round(risk.winChance * 100)}%, награда: предмет
                    {riskRewardItem ? ` "${itemName(riskRewardItem)}"` : ""} и +{risk.winCoins} coins,
                    провал: {risk.id === "fatal" ? "смерть" : `${risk.damageOnFail} урона`}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {scene.miniGame.type === "puzzle" ? (
          <div className="mt-2 grid grid-cols-2 gap-1">
            {scene.miniGame.options.map((option) => (
              <button
                key={option}
                type="button"
                disabled={isResolved}
                onClick={() => handlePuzzle(option)}
                className="win95-btn"
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}

        {message ? <p className="mt-2 win95-inset p-1">{message}</p> : null}

        {resolvedChoiceId ? (
          <button
            type="button"
            disabled={isLoading || resolvedChoiceId.includes("_death")}
            onClick={() => onContinue(resolvedChoiceId)}
            className="win95-btn mt-2"
          >
            {resolvedChoiceId.includes("_death")
              ? "Игра завершена"
              : "Продолжить по результату"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
