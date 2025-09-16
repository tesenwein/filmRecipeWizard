# Copilot Instructions — Film Recipe Wizard

These instructions help AI coding agents be productive in the Film Recipe Wizard repository. Focus on concrete, discoverable patterns, entry points, build/runtime commands, and integration details.

Key points
- Project type: Electron desktop app with a TypeScript Node main process (`src/main`) and a React/TypeScript renderer (`src/renderer`). Build artifacts live under `dist/` and packaged releases under `release/`.
- Main responsibilities: `src/main` implements the Electron app lifecycle, IPC handlers, and orchestration (image processing, storage, exports). `src/renderer` is a React app that communicates with main via the `window.electronAPI` bridge (defined in `src/main/preload.ts`).
- Important shared types: `src/shared/types.ts` defines canonical data shapes (Recipe/ProcessHistory, ProcessingResult, AppSettings). Use these types when changing IPC payloads.

Build & dev workflows
- Local dev (recommended):
  - `npm run dev` — runs `tsc --watch` for main, `webpack --watch` for renderer, waits for `dist/main/main.js` then launches Electron. Use this for iterative UI + backend changes.
  - `npm run watch:main` and `npm run watch:renderer` can be run independently for focused work.
- Build (production):
  - `npm run build` — compiles main TypeScript (`src/main/tsconfig.json`) and bundles renderer via webpack (`webpack.renderer.js`).
  - `npm run package:mac` / `npm run package` — generates icons, builds, and packages with `electron-builder` (mac packaging configured in `package.json` "build" section).
- Lint / typecheck:
  - `npm run lint` and `npm run typecheck`.

IPC & security surface
- Renderer ⇄ Main bridge: `src/main/preload.ts` exposes `window.electronAPI`. Prefer using the functions declared in `src/renderer/global.d.ts`.
- Important IPC channels (handlers in `src/main/main.ts`):
  - `process-images`, `process-with-stored-images` — primary image processing flows.
  - `generate-preview`, `generate-adjusted-preview` — create JPEG previews (used frequently when converting RAW/HEIC).
  - `save-process`, `load-recipes`, `get-process`, `update-process`, `delete-process` — persistent recipe storage operations (see `src/main/storage-service.ts`).
  - `download-xmp`, `generate-lut`, `export-recipe`, `export-all-recipes`, `import-recipe` — export/import functionality and XMP/LUT generation.
  - Progress events are emitted via `processing-progress`, `processing-complete`, and `process-updated`.

Architecture notes & patterns
- Single-source-of-truth for data: recipes/processes are managed by `StorageService` (`src/main/storage-service.ts`) and surfaced to the UI as `Recipe` objects. Storage persists minimal image data (one base64 `recipeImageData`) and result metadata. Avoid adding absolute file paths to stored objects — existing code strips them before persisting/exporting.
- Image processing: `ImageProcessor` in `src/main/image-processor.ts` handles heavy-lifting (sharp, raw conversions, OpenAI analyzer integration). When changing processing behavior, follow the current pattern: create temp files, generate previews, and avoid persisting absolute temp paths.
- AI integration: `src/services/openai-color-analyzer.ts` encapsulates OpenAI calls and prompt construction. The app stores only masked OpenAI keys in settings (main hides the real key before sending to renderer). If modifying prompts or analyzer inputs, adjust both `preload` IPC signatures and `openai-color-analyzer` to keep compatibility.
- Renderer patterns: React with Zustand store in `src/renderer/store/appStore.ts`. Components expect `electronAPI` functions to be Promise-returning and to emit progress events. UI reacts to `process-updated` events to keep the gallery in sync.
- Types & compatibility: `src/shared/types.ts` is the contract between renderer and main. Update it when changing IPC payload shapes and update both `preload.ts` and `global.d.ts` accordingly.

Conventions and gotchas
- Do not rely on absolute paths returned from processing results. The code intentionally removes `inputPath`/`outputPath` before saving/exporting.
- Limit base/reference images to 3. Many codepaths slice arrays to `slice(0,3)` — keep that behavior if changing UI or storage.
- Avoid logging or returning `openaiKey` from IPC responses. The main process masks keys before returning settings to the renderer.
- When adding new IPC handlers, expose them in `src/main/preload.ts` and update `src/renderer/global.d.ts` for type safety.
- When editing packaging settings, `package.json` contains `build` configuration for `electron-builder` (mac targets, dmg settings, files globs). Use `npm run package` scripts which call `generate-icons` first.

Where to look for examples
- IPC handlers and patterns: `src/main/main.ts` (longest single file with many handlers).
- Preload bridge: `src/main/preload.ts` and type definitions in `src/renderer/global.d.ts`.
- Storage patterns: `src/main/storage-service.ts` (read/write recipes, ID generation, convertImageToBase64, base64ToTempFile).
- Image processing: `src/main/image-processor.ts`, `src/main/lut-generator.ts`, `src/main/xmp-generator.ts`.
- Renderer usage: `src/renderer/components/App.tsx`, `src/renderer/store/appStore.ts`, `src/renderer/components/ResultsView.tsx` (shows XMP/LUT download calls).

Tasks where AI agents are most useful
- Add or change IPC handlers (remember to update `preload.ts` + `global.d.ts`).
- Refactor `ImageProcessor` internals to separate concerns (preview generation, RAW decoding, AI prompt orchestration).
- Improve error surface: standardize { success: boolean; error?: string } returns across new handlers.
- Add unit tests around prompt generation and XMP/LUT output (these are deterministic and safe to test).

Examples (explicit references)
- To add a new handler `foo` that returns a string:
  - Add `ipcMain.handle('foo', async (_event, args) => { ... })` in `src/main/main.ts`.
  - Add `foo: (args:any) => ipcRenderer.invoke('foo', args)` in `src/main/preload.ts` and add typing in `src/renderer/global.d.ts`.
  - Update any renderer callers (search for `window.electronAPI.foo`) and tests.

Edit/PR checklist for agents
- Update `src/shared/types.ts` for any contract changes and propagate types to `preload.ts` and `global.d.ts`.
- Run `npm run build` and `npm run typecheck` locally. If changing renderer code, run `npm run build:renderer` to catch bundling issues.
- Do not commit real API keys; follow existing pattern of masking in `get-settings` responses.

If anything is ambiguous or you'd like me to expand a specific section (examples, IPC mapping, or add tests), tell me which area to expand.
