"use client";

import Link from "next/link";
import { useState } from "react";
import { GameSetupForm } from "@/components/GameSetupForm";

export default function HomePage() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [status, setStatus] = useState(
    "Готово. Введите идею и создайте новую визуальную новеллу.",
  );

  return (
    <div className="win95-desktop">
      <div className="desktop-icons">
        <button
          className="desktop-icon"
          type="button"
          onClick={() => setIsMinimized(false)}
        >
          <div className="desktop-icon__image">▣</div>
          <span>Novel.exe</span>
        </button>
        <button
          className="desktop-icon"
          type="button"
          onClick={() =>
            setStatus("Подсказка: выберите язык, длину сюжета и нажмите Создать игру.")
          }
        >
          <div className="desktop-icon__image">?</div>
          <span>Help</span>
        </button>
      </div>

      {!isMinimized ? (
        <section
          className={`win95-window win95-window--main ${
            isMaximized ? "win95-window--maximized" : ""
          }`}
        >
          <div className="win95-titlebar">
            <span>ainovell.bostoncrew.ru - Setup</span>
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
              <button
                className="win95-control"
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Закрыть"
              >
                ×
              </button>
            </div>
          </div>
          <nav className="win95-menu">
            <button type="button" onClick={() => setStatus("File: новая история.")}>
              File
            </button>
            <button type="button" onClick={() => setStatus("Game: генератор готов.")}>
              Game
            </button>
            <button
              type="button"
              onClick={() => setStatus("Options: язык и длина сюжета доступны в форме.")}
            >
              Options
            </button>
            <button
              type="button"
              onClick={() =>
                setStatus("Help: опишите сюжет, выберите язык и стартуйте игру.")
              }
            >
              Help
            </button>
            <Link href="/logs">Logs</Link>
          </nav>
          <div className="win95-content scroll-thin">
            <GameSetupForm />
          </div>
          <div className="win95-status">{status}</div>
        </section>
      ) : null}

      <div className="win95-taskbar">
        <button
          className="win95-btn win95-start"
          type="button"
          onClick={() => setIsMinimized(false)}
        >
          Start
        </button>
        <button
          className="win95-btn win95-task"
          type="button"
          onClick={() => setIsMinimized(false)}
        >
          ainovell.bostoncrew.ru
        </button>
        <div className="win95-clock">23:59</div>
      </div>
    </div>
  );
}
