# Contributing to NoCodeClarity AI

## Development Setup

1. Install [Bun](https://bun.sh) and Docker
2. Clone the repo and run `bun install`
3. Copy `.env.example` to `.env` and fill in required variables
4. Start Postgres: `docker compose up db -d`
5. Generate and run migrations: `cd packages/orchestrator && bun run db:generate && bun run db:migrate`

## Monorepo Structure

- `apps/web` — Next.js frontend
- `packages/tools` — Read/write tools for Stacks protocols
- `packages/agents` — Analyst, Risk Gate, Executor agents
- `packages/orchestrator` — Pipeline coordinator + HTTP server

## Running Tests

```bash
bun test packages/tools/src/tests/integration.test.ts
```

## Code Style

- TypeScript strict mode
- No `TODO` comments in merged code
- Every transaction builder must define post-conditions
- Gate failure = REJECT (never proceed on uncertain output)
