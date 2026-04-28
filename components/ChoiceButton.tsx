import { useState } from "react";
import type { GameScene } from "@/lib/schemas";

type ChoiceButtonProps = {
  choice: GameScene["choices"][number];
  disabled?: boolean;
  onClick: () => void;
};

const riskText: Record<GameScene["choices"][number]["risk"], string> = {
  low: "низкий риск",
  medium: "средний риск",
  high: "высокий риск",
};

export function ChoiceButton({
  choice,
  disabled = false,
  onClick,
}: ChoiceButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const longText = choice.text.length > 70 || choice.hint.length > 85;

  return (
    <div className="win95-choice">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="win95-btn win95-btn--choice w-full !justify-start text-left"
        title={choice.hint}
      >
        <span className="min-w-0 flex-1">
          <span
            className={`win95-choice-text font-bold ${
              expanded ? "" : "line-clamp-2"
            }`}
          >
            {choice.text}
          </span>
          <span
            className={`win95-choice-hint ${expanded ? "" : "line-clamp-2"}`}
          >
            {choice.hint}
          </span>
        </span>
        <span className="shrink-0">[{riskText[choice.risk]}]</span>
      </button>
      {longText ? (
        <button
          type="button"
          className="win95-btn mt-1"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Свернуть текст" : "Показать полностью"}
        </button>
      ) : null}
    </div>
  );
}
