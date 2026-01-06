# dota-cm-simulator

An Electron + React desktop app to simulate Captain's Mode drafting for Dota 2.

**Purpose:** Use this simulator to practice drafting, explore hero matchups and role biases, and run mock drafts locally with configurable settings.

**Key Features:**
- **Simulate drafts:** Run mock Captain's Mode drafts AI opponents.
- **Hero data:** Uses structured hero and matchup data in `src/renderer/src/data`.
- **Pick logic:** Configurable pick/ban logic in `src/renderer/src/utils/pickLogic.jsx`.
- **Sounds & assets:** Local assets for a richer UI in `src/renderer/src/assets`.

## Quick Start

- Install dependencies:

```
npm install
```

- Run in development mode (hot reload):

```
npm run dev
```

## Building

- Build for Windows:

```
npm run build:win
```

- Build for macOS:

```
npm run build:mac
```

- Build for Linux:

```
npm run build:linux
```

## Project Layout (important files)

- `src/main` — Electron main process entry (`index.js`).
- `src/preload` — Preload script (`index.js`).
- `src/renderer` — React app and UI code.
	- `src/renderer/src/pages` — App pages (Drafting, Hero Selection, Settings).
	- `src/renderer/src/components` — UI components (`HeroCard.jsx`, `TeamDraftColumn.jsx`).
	- `src/renderer/src/data` — Hero data and matchup JSON.
	- `src/renderer/src/utils/pickLogic.jsx` — Draft decision logic.

## Development notes

- Hero and matchup data live in `src/renderer/src/data`. Editing those JSON/JS files updates available heroes and matchup logic in the simulator.
- If you change the UI or React code, `npm run dev` will reload the renderer.
- For packaging, the project uses electron-builder configuration files in the repository root.


## Acknowledgements

- Drafting logic from [Tinkering ABo(u)t by ryndrb](https://github.com/ryndrb/dota2bot)
- Matchup data also from [Tinkering ABo(u)t by ryndrb](https://github.com/ryndrb/dota2bot/blob/master/Buff/script/matchups_data.lua) and Dotabuff

---
