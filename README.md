# RADPAIR

A radiology reporting workspace: worklist, TipTap report editor, key images in the document, autosave, and sign.

**Deployed:** [Web](https://radpair.vercel.app) · [API](https://radpair-api.onrender.com) (`GET /health` when Postgres is up). Neon Postgres; Vercel `VITE_API_URL` → Render; CI on push.

## Run locally

Node.js 24, pnpm 11, two Neon projects (dev + test), direct connection strings (`sslmode=require`, no `-pooler`).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
pnpm db:migrate && pnpm db:seed
APP_ENV=test pnpm --filter api db:migrate && APP_ENV=test pnpm --filter api db:seed
pnpm dev
```

Web: port 5173. API: port 3001. Quality: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration` (test DB must differ from dev; see `apps/api/.env.test`).

## Decisions

**Key images.** Drag from the filmstrip into the report (or Insert image / Shift+⌘K / Shift+Ctrl+K at the cursor). One instance per image. Drag inside the report or Up/Down to move; Remove deletes the block. Caption on the block; document stores `imageId`, study payload supplies URLs.

**Two tabs.** Saves send `expectedVersion`. Stale save → 409 with server document; editor keeps local text; Load latest or Overwrite with mine. No silent retry on 409.

**Text around key images.** Key image is its own block. Deleting a neighbouring paragraph leaves it. Backspace/Delete at paragraph edge selects the block first; removal only when that block is deleted or Remove is used.

**Narrow layout.** ≥1024px: worklist table, filmstrip beside editor. Below: cards, horizontal filmstrip, sticky save/Sign bar. Large image: dialog at both widths.

**API and data.** Postgres: studies, images, one report per study. Body is editor JSON; key image `{ "type": "keyImage", "attrs": { "imageId", "caption" } }`. Saves bump version and store revisions; first save → draft; sign → `signed` + server rejects further writes. Study page uses three reads (`/studies/:id`, `…/images`, `…/report`) on purpose.

## Go further: laterality check

Deterministic, no model. When **body part** starts with Left or Right, the client scans report text and key-image **captions** for the opposite side word. An amber warning appears in the editor and sign dialog; **signing is not blocked**.

**Try on deploy:** unread **Jonah Hale** (Right hip) or **Elena Voss** (Left shoulder) and type the opposite side. **Nora Kim** (Left knee) seed draft includes conflicting sample text (warning also shows on signed, read-only reports). Tests: `apps/web/tests/laterality.test.ts`.

## With another day

Instead of LLM impression drafting, I would add **review report with AI before signing**. A **Review** button would send study context and the current report text to an LLM on the server. The model would return short suggestions (clarity, consistency with the study, obvious gaps), not a replacement report. The radiologist would read them, edit the draft if needed, then save and sign as today, so the signed document stays their work. Sign would stay available without running the review; the first slice would be advisory bullets only, with optional “apply this edit” only after explicit accept.

## Agents

The brief and `AGENTS.md` were the source of truth; work landed in milestones with Biome, TypeScript, tests, and manual browser checks between steps. One fix I insisted on: Backspace at the edge of text beside a key image had been deleting the image in one step; it now selects the block first, matching how radiologists expect blocks to behave.
