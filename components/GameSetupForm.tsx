"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  clearGameState,
  createInitialGameState,
  saveGameState,
} from "@/lib/game-state";
import {
  DEFAULT_STORY_TURNS,
  type GameConfig,
  type SupportedLanguage,
} from "@/lib/schemas";

type GenerateGameResponse = {
  gameConfig?: GameConfig;
  error?: string;
};

const defaultPrompt =
  "Психологический хоррор в старом санатории: герой приезжает на ночную смену, слышит голоса из закрытого крыла и понимает, что один из пациентов знает его прошлое.";

const turnOptions = [
  { value: 6, label: "Короткая" },
  { value: 9, label: "Стандарт" },
  { value: 12, label: "Длинная" },
];

export function GameSetupForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [language, setLanguage] = useState<SupportedLanguage>("ru");
  const [maxTurns, setMaxTurns] = useState(DEFAULT_STORY_TURNS);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      clearGameState();

      const response = await fetch("/api/generate-game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, language, maxTurns }),
      });

      const data = (await response.json()) as GenerateGameResponse;

      if (!response.ok || !data.gameConfig) {
        throw new Error(
          data.error ?? "Не удалось получить стартовую конфигурацию игры.",
        );
      }

      const initialState = createInitialGameState(data.gameConfig, {
        language,
        maxTurns,
      });
      saveGameState(initialState);
      router.push("/game");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось создать игру. Попробуйте снова.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="win95-grid" onSubmit={handleSubmit}>
      <div className="win95-panel">
        <strong>Новая история</strong>
        <p className="mt-1">
          Новая генерация всегда очищает прошлую игру из localStorage, поэтому
          старый сюжет больше не должен просачиваться в новый старт.
        </p>
      </div>

      <label>
        <span className="win95-label">Пожелания к сюжету</span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="win95-textarea"
          rows={7}
        />
      </label>

      <div className="setup-options-grid grid grid-cols-2 gap-2">
        <label>
          <span className="win95-label">Язык текста</span>
          <select
            className="win95-select"
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as SupportedLanguage)
            }
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </label>

        <label>
          <span className="win95-label">Длина сюжета</span>
          <select
            className="win95-select"
            value={maxTurns}
            onChange={(event) => setMaxTurns(Number(event.target.value))}
          >
            {turnOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}: {option.value} ходов
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <pre className="win95-error">{error}</pre> : null}

      <div className="flex flex-wrap gap-2">
        <button className="win95-btn" type="submit" disabled={isLoading}>
          {isLoading ? "Генерация..." : "Создать игру"}
        </button>
        <button
          className="win95-btn"
          type="button"
          onClick={() => setPrompt(defaultPrompt)}
          disabled={isLoading}
        >
          Пример
        </button>
      </div>
    </form>
  );
}
