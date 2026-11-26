# RADPAIR

A radiology reporting workspace. The worklist lists studies. The report editor is where the text and key images are written, saved, and signed.

## Deployed

The production web app is on [Vercel](https://radpair.vercel.app). The API runs on [Render](https://radpair-api.onrender.com) and talks to Postgres on Neon. `VITE_API_URL` on Vercel points at the Render service; Render sets `CORS_ORIGIN` to the Vercel URL (and `http://localhost:5173` for local dev). Push to the default branch runs lint, typecheck, unit tests, integration tests, and build in GitHub Actions.

- Web: https://radpair.vercel.app
- API: https://radpair-api.onrender.com (`GET /health` when Postgres is up)

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

**Placing and moving a key image.** Drag a filmstrip image into the report and it lands in the gap under the pointer. The same image can appear once. Click a thumbnail to open it, then Insert image, or press Cmd+Shift+K (Ctrl+Shift+K), to place the selected image at the cursor. Drag the thumbnail inside the report, or use Up and Down, to move the block. Remove deletes it. The caption is edited on the block. The document stores the image id and the study payload supplies the URL, so the editor cannot point a key image at an arbitrary address.

**Two tabs.** A save sends the version the editor loaded. The server writes only when that version still matches and the report is not signed. A stale save returns 409 with the current document. The editor keeps the local text and offers Load latest or Overwrite with mine. A conflict is never retried on its own.

**Text deleted around a key image.** A key image is its own block. Deleting a neighboring paragraph leaves it in place. Backspace or Delete at the edge of that text selects the image. The image is removed only when that selected block is deleted, or when Remove is used.

**Narrow windows.** From 1024px up, the worklist is a table and the filmstrip sits beside the editor. Below that, the worklist is cards, the filmstrip scrolls sideways, and the save state and Sign stay in a bar pinned to the bottom. The large image is a dialog at both widths.

**API and data.** Studies, images, and one report per study live in Postgres. The report body is the editor JSON, and a key image is `{ "type": "keyImage", "attrs": { "imageId", "caption" } }`. Each save stores a revision of that JSON and increments an integer version. The first save moves unread to draft. Sign sets signed and `signed_at`, and later writes are refused. A save sends `{ content, expectedVersion }`. Errors use `{ error: { code, message, details } }`. The study screen fetches study, images, and report separately (`GET /api/studies/:id`, `…/images`, `…/report`); that is intentional. `GET /api/reports/:id` and `…/history` are for the API contract and tests even though the UI does not call them.

## Left out

No login, roles, DICOM, object storage, dictation, or a generated impression. The optional laterality warning is not built. With another day I would add that warning: if the report names a side that disagrees with the study description, show it and still allow signing. No model.

## Agents

I kept the brief as the source of truth and let an agent implement one milestone at a time, after the previous one had been reviewed. I checked the result with Biome, TypeScript, the unit and integration tests, and the running app in the browser. One correction: the editor deleted a key image when Backspace was pressed at the edge of the neighboring paragraph. That was wrong. The first keystroke now selects the image, and the image is removed only when that selected block is deleted.
