# ainovell.bostoncrew.ru

MVP веб-приложения на Next.js для интерактивной AI-визуальной новеллы с генерацией сюжета через Mistral API.

## Что умеет MVP

- Генерирует `GameConfig` по пользовательскому описанию истории.
- Продолжает сюжет сцена за сценой через `/api/next-scene`.
- Валидирует все AI-ответы через `Zod`.
- Хранит состояние игры в `localStorage`.
- Поддерживает 4 режима сцен:
  - `visual_novel`
  - `hidden_object`
  - `casino`
  - `puzzle`
- Показывает героя, HP, инвентарь, лог действий, сжатое резюме истории и финальный экран.

## Стек

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Zod

## Переменные окружения

Создайте `.env.local` на основе `.env.example`.

```bash
AI_PROVIDER=mistral
AI_API_KEY=your_api_key
AI_MODEL=mistral-small-latest
AI_API_URL=https://api.mistral.ai/v1/chat/completions
AI_MAX_TOKENS=8192
AI_TIMEOUT_MS=120000
```

Старые переменные `MISTRAL_API_KEY`, `MISTRAL_MODEL`, `MISTRAL_API_URL` тоже поддерживаются. Для OpenAI-compatible API можно указать `AI_API_KEY`, `AI_MODEL` и `AI_API_URL`.

## Запуск

```bash
npm install
npm run dev
```

После запуска приложение будет доступно на `http://localhost:3000`.

## Структура

```text
app/
  api/generate-game/route.ts
  api/next-scene/route.ts
  game/page.tsx
  logs/page.tsx
  page.tsx
components/
  CharacterPortrait.tsx
  ChoiceButton.tsx
  GameScreen.tsx
  GameSetupForm.tsx
  HealthBar.tsx
  Inventory.tsx
  MiniGamePanel.tsx
  SceneLog.tsx
lib/
  game-state.ts
  mistral.ts
  prompts.ts
  schemas.ts
```

## Как это работает

1. Пользователь вводит пожелание к сюжету на главной странице.
2. `/api/generate-game` отправляет системный промпт в Mistral.
3. Сервер валидирует `GameConfig` через `Zod`.
4. Клиент создает `GameState`, сохраняет его в `localStorage` и переводит игрока на `/game`.
5. При выборе действия `/api/next-scene` запрашивает у Mistral новую `GameScene`.
6. Клиент применяет `statePatch`, обновляет сжатую память истории и лог действий.

## Замечания по MVP

- База данных не используется.
- Казино работает только на виртуальных `coins`.
- Если Mistral вернет битый JSON или API будет недоступен, UI покажет понятную ошибку и даст повторить запрос.
- Мини-игры сделаны простыми, но компонентная структура позволяет расширять механику дальше.
