type SceneLogProps = {
  actions: string[];
};

export function SceneLog({ actions }: SceneLogProps) {
  return (
    <div className="win95-panel">
      <strong>Журнал</strong>
      <div className="mt-2 max-h-28 overflow-auto scroll-thin">
        {actions.length > 0 ? (
          [...actions].reverse().map((entry, index) => (
            <p className="mb-1 border-b border-[#c0c0c0] pb-1" key={`${entry}-${index}`}>
              {entry}
            </p>
          ))
        ) : (
          <p>Пока нет записей.</p>
        )}
      </div>
    </div>
  );
}
