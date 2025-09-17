# Copilot Instructions — Film Recipe Wizard (compressed)

Short, focused notes for AI agents working in this repo.

- Type: Electron app — Node/TS main (`src/main`) + React/TS renderer (`src/renderer`). Shared types in `src/shared/types.ts`.
- Dev quick commands:

  - `npm run dev` (recommended: watch + open Electron)
  - `npm run build` (main + renderer)
  - `npm run package` / `npm run package:mac`
  - `npm run lint`, `npm run typecheck`

Conventions & gotchas:

- Where to look: `src/main/main.ts` (IPC patterns), `src/main/preload.ts`, `src/main/image-processor.ts`, `src/main/storage-service.ts`, `src/renderer/store/appStore.ts`, `src/renderer/components/ResultsView.tsx`.

Edit checklist: update `src/shared/types.ts` when changing IPC shapes; run `npm run build` and `npm run typecheck` before PR.
