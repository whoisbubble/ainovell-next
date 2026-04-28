type HealthBarProps = {
  hp: number;
  maxHp: number;
};

export function HealthBar({ hp, maxHp }: HealthBarProps) {
  const percentage = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));

  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span>HP</span>
        <span>
          {hp}/{maxHp}
        </span>
      </div>
      <div className="hp-meter">
        <div className="hp-meter__fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
