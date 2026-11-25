# RADPAIR

A radiology reporting workspace. The worklist lists studies. The report editor is where the text and key images are written, saved, and signed.

## Run locally

Node.js 24, pnpm 11, and two Neon projects (dev and test). Use each project's direct connection string. The host must not contain `-pooler`, and the URL must keep `sslmode=require`.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
pnpm db:migrate && pnpm db:seed
APP_ENV=test pnpm --filter api db:migrate
APP_ENV=test pnpm --filter api db:seed
pnpm dev
```

Put the dev URL in `apps/api/.env` and the test URL in `apps/api/.env.test`. Both files stay out of git. The web app listens on port 5173 and the API on port 3001. `GET /health` returns `status: ok` when Postgres answers.

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
```

`pnpm test:integration` reads `apps/api/.env.test` and refuses to run when that URL points at the same database as `apps/api/.env`.

## Decisions

**Placing and moving a key image.** Drag a filmstrip image into the report and it lands in the gap under the pointer. The same image can appear once. Click a thumbnail to open it large, then Insert image places it at the cursor. Cmd+Shift+K (Ctrl+Shift+K) does the same for the selected thumbnail. Inside the report, drag the thumbnail, or use Up and Down, to move that block. Remove deletes it. The caption is edited on the block. The document stores the image id, and the study payload supplies the URL, so the editor cannot point a key image at an arbitrary address.

**Two tabs.** Each save sends the version the editor loaded. The server writes only when that version still matches and the report is not signed. A stale save returns 409 with the current document. The editor keeps the local text and offers Load latest or Overwrite with mine. A conflict is never retried on its own, so one tab cannot replace the other quietly.

**Text deleted around a key image.** A key image is its own block, between the paragraphs. Clearing or deleting a neighboring paragraph leaves the image where it is. Backspace or Delete at the edge of that text selects the image. The image goes away when that selected block is deleted, or when Remove is used.

**Narrow windows.** From 1024px up, the worklist is a table and the images sit in a vertical filmstrip beside the editor. Below that, the worklist is cards, the filmstrip scrolls sideways, and the save state and Sign stay in a bar pinned to the bottom. The large image is a dialog at both widths.

**API and data.** Studies, images, and one report per study live in Postgres. The report body is the editor document as JSON. A key image is a block in that JSON: `{ "type": "keyImage", "attrs": { "imageId", "caption" } }`. Each successful save stores a revision of the same JSON and increments an integer version. The first save moves a report from unread to draft. Sign sets signed and `signed_at`, and later writes are refused. Routes: `GET /health`, `GET /api/studies`, `GET /api/studies/:id`, `GET /api/studies/:id/images`, `GET /api/studies/:id/report`, `GET /api/reports/:id`, `PUT /api/reports/:id`, `POST /api/reports/:id/sign`, `GET /api/reports/:id/history`. A save sends `{ content, expectedVersion }`. Errors use `{ error: { code, message, details } }`.
