import Image from "next/image";
import { getItemSprite, getSceneAsset } from "@/lib/visual-assets";
import type { GameConfig, GameScene } from "@/lib/schemas";

type SceneVisualProps = {
  scene: GameScene;
  gameConfig: GameConfig;
};

export function SceneVisual({ scene, gameConfig }: SceneVisualProps) {
  const backdrop = getSceneAsset(scene);
  const visibleItems = scene.availableItems.slice(0, 5);

  return (
    <div className="win95-scene">
      <Image
        src={backdrop.path}
        alt={backdrop.label}
        width={640}
        height={360}
        className="h-full w-full object-cover"
        priority
      />
      <div className="win95-scene__shade" />
      <div className="win95-scene__label">{scene.location}</div>
      <div className="win95-scene__items">
        {visibleItems.map((item) => {
          const sprite = getItemSprite(gameConfig, item.itemId);
          return (
            <div className="win95-scene__item" key={item.itemId} title={item.description}>
              <Image src={sprite.path} alt={item.visibleName} width={34} height={34} />
              <span>{item.visibleName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
