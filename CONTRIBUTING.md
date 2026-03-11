# Contributing to NoCodeClarity AI

Thanks for building on Stacks with us! 🤖⚡

## Quick Setup

### Full Mode (production)
```bash
bun install
cp .env.example .env  # fill in ANTHROPIC_API_KEY, WALLET_MNEMONIC, DATABASE_URL
docker compose up db -d
cd packages/orchestrator && bun run db:generate && bun run db:migrate && cd ../..
bun run swarm:dev          # Orchestrator on :3001
bun run --cwd apps/web dev # Web UI on :3000
```

### Solo Mode (no Docker)
```bash
bun install
cp .env.example .env  # add SOLO_MODE=true
bun run swarm:dev
```

## Monorepo Structure

```
apps/web/                → Next.js 14 frontend (Leather + Xverse wallet support)
packages/tools/          → Read/write tools for Stacks protocols
  ├── read/hiro.ts       → Chain snapshot, wallet state, network info
  ├── read/clarity.ts    → Clarity contract source + LLM analysis
  ├── read/signers.ts    → Stacks signer health + PoX cycle monitor
  └── write/builders.ts  → Unsigned transaction builders + sign/broadcast
packages/agents/         → Three-agent pipeline
  ├── Analyst            → LLM-powered chain analysis
  ├── Risk Gate          → Rule-based risk scoring
  └── Executor           → Sign + broadcast with hash check
packages/orchestrator/   → Core engine
  ├── index.ts           → StacksSwarm pipeline coordinator
  ├── server.ts          → Hono HTTP + SSE + API routes
  ├── scheduler.ts       → Recurring task scheduler
  ├── triggers.ts        → Chainhook-style event triggers
  ├── embeddings.ts      → Agent memory (LLM summaries + vector search)
  ├── sharing.ts         → Strategy export/import/sharing
  └── db/                → Drizzle schema + dual-mode DB client
```

## Running Tests

```bash
bun run --cwd packages/tools vitest run src/tests/integration.test.ts
```

Tests hit the live Stacks testnet — no local setup required.

## Code Style

- **TypeScript strict mode** — no `any` except DB/Drizzle interop
- **Post-conditions required** — every transaction builder must define post-conditions
- **Gate failure = REJECT** — never proceed on uncertain LLM output
- **Input sanitization** — all user-facing strings must be length-limited and control-char-stripped
- **No secrets in code** — all keys via env vars, never commit `.env`

## Security Rules

These are non-negotiable. PRs violating these will be rejected:

1. **Private keys must never be logged, serialized, or stored in localStorage**
2. **Kill switch (`/pause`) must always work** — no auth, no conditions
3. **Trigger conditions must be whitelisted** — no arbitrary code execution
4. **Recurring tasks and triggers must have count limits** (20 and 10 respectively)
5. **Contract IDs must be regex-validated** before any API call
6. **Goals must be sanitized** — 500-char max, control characters stripped

## Pull Request Process

1. Fork → create a feature branch
2. Write code following the style guide above
3. Run integration tests
4. Submit PR with:
   - What you changed and why
   - Any new API routes or env vars
   - Security implications (if any)

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Unsigned transactions | Non-custodial — user's key signs locally |
| Three-agent pipeline | Separation of concerns — analysis, risk, execution |
| Post-conditions on every tx | Stacks-enforced safety — mismatch = revert |
| In-memory solo mode | Removes Docker barrier for first-time users |
| Hash check before broadcast | Prevents signing tampered transactions |

## Need Help?

- Open an [issue](https://github.com/NoCodeClarity/NoCodeClarityAI/issues)
- Read the [README](README.md) for architecture and API docs

---

*Building the Liberty Layer for Bitcoin DeFi.*
