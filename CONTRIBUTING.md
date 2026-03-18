# Contributing to NoCodeClarity AI

Thanks for building on Stacks with us! 🤖⚡

## Quick Setup

### Prerequisites
- [Bun](https://bun.sh) v1.0+
- Git
- A Leather or Xverse browser wallet (for frontend testing)

### Full Mode (PostgreSQL + Frontend)
```bash
git clone https://github.com/NoCodeClarity/NoCodeClarityAI.git
cd NoCodeClarityAI
bun install
cp .env.example .env  # Fill in: ANTHROPIC_API_KEY, WALLET_MNEMONIC, DATABASE_URL

# Start database
docker compose up db -d

# Run migrations
cd packages/orchestrator && bun run db:generate && bun run db:migrate && cd ../..

# Start both servers
bun run swarm:dev                              # Orchestrator on :3001
cd packages/frontend && npm run dev            # Frontend on :5173
```

### Solo Mode (no Docker)
```bash
bun install
cp .env.example .env  # Add SOLO_MODE=true, ANTHROPIC_API_KEY, WALLET_MNEMONIC
bun run swarm:dev                              # Orchestrator on :3001
cd packages/frontend && npm run dev            # Frontend on :5173
```

Open **http://localhost:5173** → Connect Leather or Xverse → Pick a strategy → Submit your first goal.

---

## Monorepo Structure

```
packages/frontend/               → React + Vite + Tailwind CSS v4
  ├── Console                    → 3-panel: portfolio + execution feed + commands
  ├── Activity                   → Task history with Hiro Explorer links
  ├── Vault                      → STX/sBTC balance cards + yield positions
  ├── Stacking                   → PoX dashboard: solo stack + pool delegation
  ├── Triggers                   → Chain trigger manager (6 condition types)
  ├── Strategies                 → Marketplace: browse/import/share strategies
  ├── SBTCPanel                  → sBTC deposit/withdraw with peg health
  ├── NetworkToggle              → Mainnet/testnet switch (persisted)
  ├── ErrorBoundary              → Graceful error handling on all pages
  └── WalletProvider             → @stacks/connect + network state + cleanup

packages/tools/                  → Protocol interactions
  ├── read/hiro.ts               → 10 read tools (Hiro API)
  ├── read/clarity.ts            → Clarity contract analyzer (Hiro + Claude)
  ├── read/signers.ts            → Stacks signer health + PoX monitor
  └── write/builders.ts          → 12 transaction builders (all protocols)

packages/agents/                 → AI pipeline (direct fetch, no SDK)
  ├── Analyst                    → LLM-powered chain analysis
  ├── Risk Gate                  → Rule-based risk scoring
  └── Executor                   → Sign + broadcast with hash check

packages/orchestrator/           → Core engine
  ├── index.ts (StacksSwarm)     → Pipeline coordinator + DB + embeddings
  ├── server.ts                  → Hono HTTP + SSE + API + rate limiter + SPA
  ├── scheduler.ts               → Recurring task scheduler
  ├── triggers.ts                → Chainhook-style event trigger engine
  ├── embeddings.ts              → Agent memory (pgvector + OpenAI)
  ├── sharing.ts                 → Strategy export/import/URL sharing
  └── db/                        → Drizzle schema + pgvector + dual-mode client
```

## Running Tests

```bash
# Unit tests (no network required)
bun run --cwd packages/tools vitest run src/tests/builders.test.ts
bun run --cwd packages/orchestrator vitest run src/tests/orchestrator.test.ts

# Integration tests (hits Stacks testnet)
HIRO_API_KEY=your_key bun run --cwd packages/tools vitest run src/tests/integration.test.ts

# Typecheck entire monorepo
bunx tsc --noEmit

# Build frontend
cd packages/frontend && bunx vite build
```

## Code Style

- **TypeScript strict mode** — no `any` except DB/Drizzle interop
- **Post-conditions required** — every transaction builder must define post-conditions
- **Gate failure = REJECT** — never proceed on uncertain LLM output
- **Input sanitization** — all user-facing strings length-limited + control-char-stripped
- **UUID validation** — all task ID params must be UUID format-checked
- **No secrets in code** — all keys via env vars, never commit `.env`
- **Error boundaries** — all new pages must be wrapped in `<ErrorBoundary>`

## Security Rules

These are **non-negotiable**. PRs violating these will be rejected:

1. **Private keys must never be logged, serialized, or stored in localStorage**
2. **Kill switch (`/pause`) must always work** — no auth, no conditions
3. **Trigger conditions must be whitelisted** — no arbitrary code execution
4. **Recurring tasks and triggers must have count limits** (20 and 10)
5. **Contract IDs must be regex-validated** before any API call
6. **Goals must be sanitized** — 500-char max, control chars stripped
7. **Broadcast payloads must be validated** — hex-only, max 10KB
8. **Rate limiting must apply to all `/api/*` routes** — 30 req/min/IP

> **Security Audited by Jubilee Labs.** All Critical/High findings remediated.

## Pull Request Process

1. Fork → create a feature branch
2. Write code following the style guide above
3. Run `bunx tsc --noEmit` + unit tests
4. Submit PR with:
   - What you changed and why
   - Any new API routes or env vars
   - Security implications (if any)

## Frontend Development

```bash
cd packages/frontend
npm run dev    # Hot-reload on :5173, proxies /api/* and /stream to :3001
```

**Adding a new page:**
1. Create `src/pages/YourPage.tsx`
2. Wrap content in `<ErrorBoundary>` + include `<Navbar />`
3. Add route to `src/App.tsx`
4. Add nav link to `src/components/Navbar.tsx` (both desktop and mobile)

**Adding an API function:**
1. Add typed function to `src/lib/api.ts`
2. Use the shared `request<T>` helper for consistent error handling

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Unsigned transactions | Non-custodial — user's key signs locally |
| Three-agent pipeline | Separation of concerns — analysis, risk, execution |
| Post-conditions on every tx | Stacks-enforced safety — mismatch = revert |
| In-memory solo mode | Removes Docker barrier for first-time users |
| Hash check before broadcast | Prevents signing tampered transactions |
| Client-side signing | Wallet popup via Stacks Connect — no seed phrase needed |
| pgvector embeddings | Agent memory for context-aware future decisions |
| SSE over WebSockets | Simpler server push, auto-reconnect built into EventSource |
| Rate limiter in-memory | No external dependency, auto-cleanup every 5min |

## Need Help?

- Open an [issue](https://github.com/NoCodeClarity/NoCodeClarityAI/issues)
- Read the [README](README.md) for architecture and API docs
- See the [QUICK_START.md](QUICK_START.md) for first-time setup

---

*Building the Liberty Layer for Bitcoin DeFi.*
