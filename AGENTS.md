# RADPAIR agent instructions

Build the radiology reporting workspace described in the take-home. The baseline is the priority. Finish a small product that a reviewer can open, reload, and try to break.

Work one milestone at a time. Do not start the next milestone until the user sends its prompt. Do not create git commits unless the user asks. Do not claim a test passed unless you ran it. Before handing a milestone back, run the relevant tests, Biome, and TypeScript, and fix the failures.

The user owns the Neon URLs. They belong in `apps/api/.env` and `apps/api/.env.test`. Never commit those files, and never ask the user to paste a connection string into the chat.

## Stack

- pnpm workspaces and Turborepo
- React, Vite, TypeScript, Tailwind, shadcn, TanStack Query, React Router, TipTap
- Fastify, Drizzle, PostgreSQL on Neon, Zod, Pino
- Vitest. API tests use Fastify `inject`
- Biome, strict TypeScript
- Vercel for the web app, Render for the API

There is no login, no DICOM, no object storage, no Redis, and no rate limiting.

## Environments

`APP_ENV` is `dev`, `test`, or `prod`. An existing `APP_STAGE` value is still accepted when `APP_ENV` is unset.

- Local development loads `apps/api/.env` and uses the Neon dev project.
- Tests load `apps/api/.env.test` and use the Neon test project.
- Render uses the dev project URL in the host environment. It does not load an env file.
- Use the direct Neon connection string. Keep `sslmode=require`.
- The test process refuses to start when the test URL has the same host and database name as the dev URL.
- The pool max is 3. Cloud URLs connect with TLS.

## Product decisions

The report is a TipTap document stored as JSON. A key image is a block node in that document:

```json
{ "type": "keyImage", "attrs": { "imageId": "…", "caption": "…" } }
```

The report `content` JSON is where a key image sits. The node stores `imageId`. The study payload carries the image URL. `report_revisions` stores snapshots of that same JSON.

Placement is "insert at cursor" from the selected filmstrip image, plus `Mod+Shift+K`. Up and Down move the block. Remove deletes it. The same image can appear only once. Deleting a neighboring paragraph leaves the image in place. The image is removed when its own block is deleted.

Studies are seeded with an empty report, so a version always exists. The first successful save moves `unread` to `draft`. Sign sets `signed` and `signed_at`. Signing requires text or a key image. The server rejects an empty report.

Saves send the document and the version the editor loaded. The update runs only when that version still matches and the report is not signed. A stale save returns `409` `version_conflict` and includes the current document and version. A write after sign returns `403` `report_signed`. The editor keeps the local text. Autosave stops. The user chooses either to load the other version or to overwrite with theirs. A `409` is never retried on its own.

Autosave waits 800ms, and also flushes on blur and before leaving the page. The visible states are Saved, Saving, Couldn't save, and Conflict. A failed save keeps the text on screen. Leaving during a failed save asks for confirmation.

The study query fills the editor once. A later refetch must not reset it.

At 1024px and above, the worklist is a table and the study page is a filmstrip beside the editor. Below that, the worklist is cards, the filmstrip is a horizontal strip, and the save state and Sign stay in a sticky bar. The large image is a dialog at both widths.

Images are synthetic files in `apps/web/public/studies`. Seed eight studies: four unread, two draft, two signed. Sort unread, then draft, then signed, then study date descending.

## API

```
GET   /health
GET   /api/studies
GET   /api/studies/:id
GET   /api/studies/:id/images
GET   /api/studies/:id/report
GET   /api/reports/:id
PUT   /api/reports/:id
POST  /api/reports/:id/sign
GET   /api/reports/:id/history
```

A save sends `{ content, expectedVersion }`. Signing sends `{ expectedVersion }`.

Errors use one body:

```json
{ "error": { "code": "validation_error", "message": "…", "details": {} } }
```

Codes: `validation_error` (400), `payload_too_large` (413), `not_found` (404), `version_conflict` (409), `report_signed` (403), `database_unavailable` (503), `internal_error` (500). The body limit is 256 KB. Zod contracts live in `@repo/contracts`. The server walks a report document iteratively, with a depth cap of 12 and a node cap of 2000. Allowed nodes are `doc`, `paragraph`, `text`, `heading`, `bulletList`, `orderedList`, `listItem`, and `keyImage`. Marks are bold and italic. A key image must belong to that study. Caption max is 240 characters.

Save and sign go through one update function. Routes do not update the row themselves.

## Layout

```
apps/api                 Fastify
apps/web                 Vite shell with routing and TanStack Query
packages/config-biome
packages/config-typescript   base, node, vite
packages/contracts           Zod contracts shared by the API and the web app
packages/vitest-config
```

`@/` is a different folder in each app. In `apps/api` it is `apps/api/src`. In `apps/web` it is `apps/web/src`. Declare the alias in that app's `tsconfig.json`, and again in `tsup` or Vite, so the two apps never share one path. Shared packages stay `@repo/...`. Keep the `.ts` extension on API imports.

`pnpm lint` runs Biome once over the repo. `pnpm typecheck`, `pnpm test`, and `pnpm test:integration` go through Turbo.

## Tests that protect the baseline

Add these with the report API, not before:

- A save followed by a read returns the same document, including the key image's place and caption.
- A stale version returns 409 and the row is unchanged.
- A patch after sign returns 403 and the row is unchanged.
- An image id from another study returns 400.
- A deeply nested document returns 400.
- A body over the limit returns 413.

## Go further

Ship the baseline first. The only extra, if the baseline is deployed and the conflict tests pass, is a deterministic laterality check. It warns when the report text names a side that disagrees with the study description. It does not block signing. No model and no API key.

## Out of scope

No authentication, roles, audit history, offline editing, dictation, or generated impressions.
