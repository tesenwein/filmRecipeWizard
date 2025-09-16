# Copilot Instructions — Film Recipe Wizard (compressed)

Short, focused notes for AI agents working in this repo.

- Type: Electron app — Node/TS main (`src/main`) + React/TS renderer (`src/renderer`). Shared types in `src/shared/types.ts`.
- Dev quick commands:

  - `npm run dev` (recommended: watch + open Electron)
  - `npm run build` (main + renderer)
  - `npm run package` / `npm run package:mac`
  - `npm run lint`, `npm run typecheck`

- IPC bridge: `src/main/preload.ts` exposes `window.electronAPI`. Keep `global.d.ts` in sync when adding handlers.

  - Primary handlers: `process-images`, `process-with-stored-images`, `generate-preview`, `save-process`, `load-recipes`, `get-process`, `update-process`, `delete-process`, `download-xmp`, `generate-lut`, `export-recipe`, `export-all-recipes`, `import-recipe`.
  - Events: `processing-progress`, `processing-complete`, `process-updated`.

- Important services: `StorageService` (`src/main/storage-service.ts`) — canonical recipe storage; `ImageProcessor` (`src/main/image-processor.ts`) — RAW/JPEG processing + AI integration; `openai-color-analyzer` (`src/services/openai-color-analyzer.ts`).

- Conventions & gotchas:

  - Persist only one base64 `recipeImageData`; do NOT persist absolute temp paths (they're stripped before saving/exporting).
  - Limit reference/base images to 3 (`slice(0,3)` patterns exist).
  - Mask OpenAI keys; `get-settings` returns masked `openaiKey`.
  - When adding IPC: update `preload.ts` and `src/renderer/global.d.ts`.

- Where to look: `src/main/main.ts` (IPC patterns), `src/main/preload.ts`, `src/main/image-processor.ts`, `src/main/storage-service.ts`, `src/renderer/store/appStore.ts`, `src/renderer/components/ResultsView.tsx`.

- Quick example: add `foo` IPC
  1. `ipcMain.handle('foo', ...)` in `src/main/main.ts`
  2. add `foo: (args)=>ipcRenderer.invoke('foo', args)` in `src/main/preload.ts`
  3. add typing in `src/renderer/global.d.ts` and call via `window.electronAPI.foo(...)`.

Edit checklist: update `src/shared/types.ts` when changing IPC shapes; run `npm run build` and `npm run typecheck` before PR.
