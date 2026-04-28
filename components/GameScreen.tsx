"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  applyMiniGamePatch,
  applySceneToGameState,
  loadGameState,
  saveGameState,
} from "@/lib/game-state";
import type { GameScene, GameState } from "@/lib/schemas";
import { CharacterPortrait } from "./CharacterPortrait";
import { ChoiceButton } from "./ChoiceButton";
import { HealthBar } from "./HealthBar";
import { Inventory } from "./Inventory";
import { MiniGamePanel } from "./MiniGamePanel";
import { SceneLog } from "./SceneLog";
import { SceneVisual } from "./SceneVisual";

type NextSceneResponse = {
  scene?: GameScene;
  error?: string;
};

const modeLabels: Record<GameScene["mode"], string> = {
  visual_novel: "Visual Novel",
  hidden_object: "Hidden Object",
  casino: "Roulette",
  puzzle: "Puzzle",
};

export function GameScreen() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [statusText, setStatusText] = useState("Готово.");
  const [error, setError] = useState<string | null>(null);
  const [retryChoiceId, setRetryChoiceId] = useState<string | null>(null);

  useEffect(() => {
    setGameState(loadGameState());
  }, []);

  function updateState(nextState: GameState) {
    setGameState(nextState);
    saveGameState(nextState);
  }

  async function requestNextScene(choiceId: string) {
    if (!gameState) {
      return;
    }

    if (gameState.isFinal) {
      setStatusText("Игра уже завершена.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setRetryChoiceId(choiceId);
    setStatusText("Запрашиваю следующую сцену...");

    try {
      const response = await fetch("/api/next-scene", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameConfig: gameState.gameConfig,
          gameState,
          choiceId,
        }),
      });

      const data = (await response.json()) as NextSceneResponse;

      if (!response.ok || !data.scene) {
        throw new Error(
          data.error ?? "Не удалось получить следующую сцену. Попробуйте ещё раз.",
        );
      }

      updateState(applySceneToGameState(gameState, data.scene));
      setRetryChoiceId(null);
      setStatusText("Сцена загружена.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось продолжить игру.",
      );
      setStatusText("Ошибка генерации сцены.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleMiniGameUpdate(payload: {
    latestAction: string;
    hpDelta?: number;
    coinsDelta?: number;
    addItemIds?: string[];
    addFlags?: string[];
  }) {
    if (!gameState) {
      return;
    }

    updateState(applyMiniGamePatch(gameState, payload));
    setStatusText("Результат мини-игры применён.");
  }

  function handleMenuAction(label: string) {
    setStatusText(label);
  }

  if (!gameState) {
    return (
      <div className="win95-desktop">
        <section className="win95-window win95-window--main">
          <div className="win95-titlebar">
            <span>ainovell.bostoncrew.ru - Game.exe</span>
            <div className="win95-titlebar__buttons">
              <Link className="win95-control" href="/">
                ×
              </Link>
            </div>
          </div>
          <div className="win95-content">
            <div className="win95-panel">
              <strong>Активная игра не найдена</strong>
              <p className="mt-2">Создайте новую игру на стартовом экране.</p>
              <Link className="win95-btn mt-3" href="/">
                На рабочий стол
              </Link>
            </div>
          </div>
        </section>
        <div className="win95-taskbar">
          <Link className="win95-btn win95-start" href="/">
            Start
          </Link>
          <Link className="win95-btn win95-task" href="/">
            Game.exe
          </Link>
        </div>
      </div>
    );
  }

  const { gameConfig, currentScene } = gameState;
  const ending = currentScene.final;
  const turnLabel = `${Math.max(gameState.turnCount, 0)}/${gameState.maxTurns}`;
  const hasMiniGame = currentScene.miniGame.type !== "none";

  return (
    <div className="win95-desktop">
      <div className="desktop-icons">
        <Link className="desktop-icon" href="/">
          <div className="desktop-icon__image">⌂</div>
          <span>Setup</span>
        </Link>
        <Link className="desktop-icon" href="/logs">
          <div className="desktop-icon__image">≡</div>
          <span>Logs</span>
        </Link>
      </div>

      {!isMinimized ? (
        <section
          className={`win95-window win95-window--main ${
            isMaximized ? "win95-window--maximized" : ""
          }`}
        >
          <div className="win95-titlebar">
            <span>{gameConfig.title}</span>
            <div className="win95-titlebar__buttons">
              <button
                className="win95-control"
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Свернуть"
              >
                _
              </button>
              <button
                className="win95-control"
                type="button"
                onClick={() => setIsMaximized((value) => !value)}
                title="Развернуть"
              >
                □
              </button>
              <Link className="win95-control" href="/" title="Закрыть">
                ×
              </Link>
            </div>
          </div>
          <nav className="win95-menu">
            <Link href="/">File</Link>
            <button
              type="button"
              onClick={() => handleMenuAction(`Сцена: ${currentScene.title}`)}
            >
              Scene
            </button>
            <button
              type="button"
              onClick={() =>
                handleMenuAction(`Инвентарь: ${gameState.inventory.length} предметов`)
              }
            >
              Inventory
            </button>
            <Link href="/logs">Logs</Link>
            <button
              type="button"
              onClick={() =>
                handleMenuAction("Подсказка: выбирайте действие или завершите мини-игру.")
              }
            >
              Help
            </button>
          </nav>
          <div className="win95-content scroll-thin">
            <div className="game-layout grid h-full min-h-0 grid-cols-[1fr_210px] gap-2">
              <div className="min-w-0 space-y-2 overflow-auto pr-1 scroll-thin">
                <div className="win95-panel">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <strong className="block truncate">{currentScene.title}</strong>
                      <span className="block truncate">
                        {currentScene.location} | {modeLabels[currentScene.mode]}
                      </span>
                    </div>
                    <span className="win95-inset px-1">Ход {turnLabel}</span>
                  </div>
                  <SceneVisual scene={currentScene} gameConfig={gameConfig} />
                  <p className="mt-2">{currentScene.description}</p>
                </div>

                <div className="win95-panel">
                  <strong>Диалоги</strong>
                  <div className="mt-2">
                    {currentScene.dialogues.map((dialogue, index) => (
                      <article
                        key={`${dialogue.speakerId}-${index}`}
                        className="win95-dialogue"
                      >
                        <strong>{dialogue.speakerName}</strong>{" "}
                        <span>[{dialogue.emotion}]</span>
                        <p>{dialogue.text}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <MiniGamePanel
                  scene={currentScene}
                  gameConfig={gameConfig}
                  isLoading={isLoading}
                  onApplyResult={handleMiniGameUpdate}
                  onContinue={requestNextScene}
                />

                <div className="win95-panel">
                  {error ? (
                    <div className="mb-2">
                      <pre className="win95-error">{error}</pre>
                      {retryChoiceId ? (
                        <button
                          type="button"
                          onClick={() => requestNextScene(retryChoiceId)}
                          disabled={isLoading}
                          className="win95-btn mt-2"
                        >
                          Повторить
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {gameState.isFinal && ending.isFinal ? (
                    <div className="win95-panel">
                      <strong>{ending.endingTitle}</strong>
                      <p className="mt-2">{ending.endingDescription}</p>
                      <Link className="win95-btn mt-3" href="/logs">
                        Открыть журнал
                      </Link>
                    </div>
                  ) : hasMiniGame ? (
                    <p className="win95-inset p-1">
                      Завершите мини-игру выше, чтобы история пошла по её результату.
                    </p>
                  ) : (
                    <div className="grid gap-1">
                      <strong>Выбор действия</strong>
                      {currentScene.choices.map((choice) => (
                        <ChoiceButton
                          key={choice.id}
                          choice={choice}
                          disabled={isLoading}
                          onClick={() => requestNextScene(choice.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <aside className="min-w-0 space-y-2 overflow-auto scroll-thin">
                <CharacterPortrait
                  portrait={gameConfig.hero.portrait}
                  name={gameConfig.hero.name}
                />
                <div className="win95-panel">
                  <strong>{gameConfig.hero.name}</strong>
                  <p className="mt-1">{gameState.heroCurrentDescription}</p>
                  <div className="mt-2">
                    <HealthBar hp={gameState.heroHp} maxHp={gameConfig.hero.maxHp} />
                  </div>
                  <p className="mt-2">Coins: {gameState.coins}</p>
                </div>
                <Inventory gameConfig={gameConfig} inventoryIds={gameState.inventory} />
                <SceneLog actions={gameState.latestActions} />
              </aside>
            </div>
          </div>
          <div className="win95-status">
            {statusText} {gameState.compressedHistory || gameConfig.mainGoal}
          </div>
        </section>
      ) : null}

      <div className="win95-taskbar">
        <Link className="win95-btn win95-start" href="/">
          Start
        </Link>
        <button
          type="button"
          className="win95-btn win95-task"
          onClick={() => setIsMinimized(false)}
        >
          {gameConfig.title}
        </button>
        <div className="win95-clock">{turnLabel}</div>
      </div>
    </div>
  );
}
