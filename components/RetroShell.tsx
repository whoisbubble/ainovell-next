"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

type RetroShellProps = {
  children: ReactNode;
};

export function RetroShell({ children }: RetroShellProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function handleMove(event: PointerEvent) {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setOffset({ x, y });
    }

    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  return (
    <main
      className="retro-shell"
      style={
        {
          "--parallax-x": `${offset.x}`,
          "--parallax-y": `${offset.y}`,
        } as CSSProperties
      }
    >
      <div className="retro-bg" />
      <div className="monitor-stage">
        <img
          className="monitor-frame"
          src="/assets/monitor.png"
          alt=""
          draggable={false}
        />
        <section className="monitor-screen">{children}</section>
      </div>
    </main>
  );
}
