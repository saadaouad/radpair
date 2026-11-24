# RADPAIR

Radiology reporting workspace. This milestone boots the API and connects it to Postgres. The worklist and report editor come in later milestones.

## Prerequisites

- Node.js 24
- pnpm 11
- Two Neon projects, dev and test. Use the direct connection string from each. The host must not contain `-pooler`, and the URL must keep `sslmode=require`.

## Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
```

Put the dev project URL in `apps/api/.env` and the test project URL in `apps/api/.env.test`. Both files stay out of git.

## Run

```bash
pnpm dev
```

The API listens on port 3001. `GET http://localhost:3001/health` returns `status: ok` when Postgres answers.

```bash
pnpm check-types
pnpm lint
pnpm test:unit
pnpm test:integration
```

`pnpm test:integration` reads `apps/api/.env.test` and refuses to run when that URL points at the same database as `apps/api/.env`.

Product decisions for the rest of the build are in `AGENTS.md`.
