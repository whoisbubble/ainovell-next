import Image from "next/image";
import { getItemSprite } from "@/lib/visual-assets";
import type { GameConfig } from "@/lib/schemas";

type InventoryProps = {
  gameConfig: GameConfig;
  inventoryIds: string[];
};

export function Inventory({ gameConfig, inventoryIds }: InventoryProps) {
  const items = inventoryIds
    .map((itemId) => gameConfig.items.find((item) => item.id === itemId))
    .filter((item): item is GameConfig["items"][number] => Boolean(item));

  return (
    <div className="win95-panel">
      <strong>Инвентарь</strong>
      <div className="mt-2 grid gap-1">
        {items.length > 0 ? (
          items.map((item) => {
            const sprite = getItemSprite(gameConfig, item.id);
            return (
              <div className="flex items-center gap-2" key={item.id} title={item.description}>
                <Image src={sprite.path} alt="" width={22} height={22} />
                <span className="truncate">{item.name}</span>
              </div>
            );
          })
        ) : (
          <span>Пусто</span>
        )}
      </div>
    </div>
  );
}
