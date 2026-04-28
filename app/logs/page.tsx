"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadGameState } from "@/lib/game-state";
import type { GameState } from "@/lib/schemas";

export default function LogsPage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [status, setStatus] = useState("Story memory loaded from localStorage.");

  useEffect(() => {
    setGameState(loadGameState());
  }, []);

  return (
    <div className="win95-desktop">
      {!isMinimized ? (
        <section
          className={`win95-window win95-window--main ${
            isMaximized ? "win95-window--maximized" : ""
          }`}
        >
          <div className="win95-titlebar">
            <span>ainovell.bostoncrew.ru - Story Logs</span>
            <div className="win95-titlebar__buttons">
              <button
                className="win95-control"
                type="button"
                onClick={() => setIsMinimized(true)}
              >
                _
              </button>
              <button
                className="win95-control"
                type="button"
                onClick={() => setIsMaximized((value) => !value)}
              >
                □
              </button>
              <Link className="win95-control" href="/">
                ×
              </Link>
            </div>
          </div>
          <nav className="win95-menu">
            <Link href="/game">Game</Link>
            <Link href="/">New</Link>
            <button
              type="button"
              onClick={() => setStatus("Журнал показывает последние 12 действий.")}
            >
              Help
            </button>
          </nav>
          <div className="win95-content scroll-thin">
            {!gameState ? (
              <div className="win95-panel">
                <strong>Журнал пуст</strong>
                <p className="mt-2">Сначала создайте новую игру.</p>
                <Link href="/" className="win95-btn mt-3">
                  На старт
                </Link>
              </div>
            ) : (
              <div className="grid gap-2">
                <div className="win95-panel">
                  <strong>{gameState.gameConfig.title}</strong>
                  <p className="mt-2">{gameState.compressedHistory}</p>
                  <p className="mt-2">
                    Ходы: {Math.max(gameState.turnCount, 0)}/{gameState.maxTurns}
                  </p>
                </div>

                <div className="win95-panel">
                  <strong>Действия игрока</strong>
                  <div className="mt-2 grid gap-1">
                    {gameState.latestActions.length > 0 ? (
                      gameState.latestActions.map((action, index) => (
                        <div className="win95-inset p-1" key={`${action}-${index}`}>
                          {index + 1}. {action}
                        </div>
                      ))
                    ) : (
                      <p>Пока нет действий.</p>
                    )}
                  </div>
                </div>

                {gameState.isFinal && gameState.currentScene.final.isFinal ? (
                  <div className="win95-panel">
                    <strong>{gameState.currentScene.final.endingTitle}</strong>
                    <p className="mt-2">
                      {gameState.currentScene.final.endingDescription}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <div className="win95-status">{status}</div>
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
          Story Logs
        </button>
      </div>
    </div>
  );
}
