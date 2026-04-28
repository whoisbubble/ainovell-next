import type { Portrait } from "@/lib/schemas";

const colors: Record<Portrait["color"], string> = {
  gray: "#8f8f8f",
  red: "#b43131",
  blue: "#2d62b7",
  green: "#267a42",
  purple: "#6a48a8",
};

type CharacterPortraitProps = {
  portrait: Portrait;
  name: string;
};

export function CharacterPortrait({
  portrait,
  name,
}: CharacterPortraitProps) {
  const color = colors[portrait.color];
  const skin = portrait.body === "armor" ? "#e0b996" : "#f0c6a8";
  const bg =
    portrait.color === "red"
      ? "#2f1010"
      : portrait.color === "blue"
        ? "#10233f"
        : portrait.color === "green"
          ? "#12321f"
          : portrait.color === "purple"
            ? "#24163d"
            : "#2c2c2c";

  const hair = {
    messy: <path d="M34 47l10-21 8 12 8-17 9 16 9-13 16 25z" fill={color} stroke="#000" strokeWidth="3" />,
    short: <path d="M38 44c8-17 44-17 52 0v13H38z" fill={color} stroke="#000" strokeWidth="3" />,
    long: <path d="M34 43c7-23 53-23 60 0v48H34z" fill={color} stroke="#000" strokeWidth="3" />,
    hood: <path d="M30 55c4-36 64-36 68 0v48H30z" fill={color} stroke="#000" strokeWidth="3" />,
  }[portrait.hair];

  const mouth = {
    neutral: <path d="M55 74h18" stroke="#000" strokeWidth="3" />,
    angry: <path d="M55 76h19" stroke="#000" strokeWidth="3" />,
    sad: <path d="M55 78q8-8 18 0" stroke="#000" strokeWidth="3" fill="none" />,
    smile: <path d="M55 72q8 8 18 0" stroke="#000" strokeWidth="3" fill="none" />,
    scar: <path d="M55 74h18" stroke="#000" strokeWidth="3" />,
  }[portrait.face];

  const brows = {
    neutral: "M49 58h10M69 58h10",
    angry: "M49 56l10 4M79 56l-10 4",
    sad: "M49 60l10-4M79 60l-10-4",
    smile: "M49 56h10M69 56h10",
    scar: "M49 58h10M69 58h10",
  }[portrait.face];

  const body = {
    coat: <path d="M34 91h60l8 31H26z" fill={color} stroke="#000" strokeWidth="3" />,
    armor: (
      <>
        <path d="M37 91h54l11 31H26z" fill="#b9c0c8" stroke="#000" strokeWidth="3" />
        <path d="M46 99h36M42 109h44" stroke="#5b6670" strokeWidth="4" />
      </>
    ),
    hoodie: (
      <>
        <path d="M34 91h60l8 31H26z" fill={color} stroke="#000" strokeWidth="3" />
        <path d="M52 93q12 12 24 0" stroke="#000" strokeWidth="3" fill="none" />
      </>
    ),
    dress: <path d="M46 90h36l20 32H26z" fill={color} stroke="#000" strokeWidth="3" />,
  }[portrait.body];

  return (
    <div className="win95-panel">
      <svg
        className="pixel-portrait"
        viewBox="0 0 128 128"
        role="img"
        aria-label={name}
      >
        <rect width="128" height="128" fill={bg} />
        <rect x="21" y="17" width="86" height="102" fill="#c0c0c0" stroke="#000" strokeWidth="3" />
        {hair}
        <rect x="44" y="43" width="40" height="43" fill={skin} stroke="#000" strokeWidth="3" />
        {portrait.hair === "hood" ? (
          <path d="M43 45q21-18 42 0" stroke="#000" strokeWidth="3" fill="none" />
        ) : null}
        <path d={brows} stroke="#000" strokeWidth="3" strokeLinecap="square" />
        <rect x="52" y="63" width="5" height="5" fill="#000" />
        <rect x="72" y="63" width="5" height="5" fill="#000" />
        {mouth}
        {portrait.face === "scar" ? (
          <path d="M78 47l-13 28" stroke="#8b0000" strokeWidth="3" />
        ) : null}
        {body}
        <path d="M64 91v30" stroke="#000" strokeWidth="3" opacity="0.45" />
      </svg>
      <div className="mt-1 truncate text-center font-bold">{name}</div>
    </div>
  );
}
