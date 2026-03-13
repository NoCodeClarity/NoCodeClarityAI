# NoCodeClarity AI 🤖⚡

[![Stacks](https://img.shields.io/badge/Stacks-Bitcoin_L2-5546FF)](https://www.stacks.co)
[![sBTC](https://img.shields.io/badge/sBTC-Enabled-f7931a?logo=bitcoin&logoColor=white)](https://www.stacks.co/sbtc)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-purple)](https://github.com/Jubilee-Protocol/Openclaw-Skill-Jubilee)
[![AIBTC](https://img.shields.io/badge/AIBTC-Network-orange)](https://aibtc.dev)
[![Donate Crypto](https://img.shields.io/badge/Donate-Crypto-f7931a?logo=bitcoin&logoColor=white)](https://commerce.coinbase.com/checkout/122a2979-e559-44b9-bb9d-2ff0c6a3025b)

> **Your AI manages Bitcoin yield on Stacks so you don't have to.**

NoCodeClarity AI is the **most comprehensive AI agent platform for Stacks**. It autonomously manages sBTC yield, PoX stacking, DEX swaps across several protocols, lending, liquid stacking, and contract security analysis. Non-custodial. Risk-gated. Kill switch always one click away.

Tell it what you want in plain English. Three AI agents handle the rest.

---

## Why NoCodeClarity?

| Problem | Solution |
|---------|----------|
| DeFi on Stacks is beautiful, yet complex.  7 protocols, PoX cycles, sBTC peg monitoring | AI agents handle the complexity for you |
| One bad transaction can drain your wallet | **Risk Gate** blocks anything above your threshold |
| You have to watch the market 24/7 | **Chain triggers** react to sBTC peg drops, balances, PoX cycles |
| No way to automate recurring DeFi tasks | **Scheduler** runs goals on intervals (15m to 30 days) |
| Can't verify if a contract is safe before depositing | **Clarity Analyzer** reads contract source and audits it with LLM |
| Tools exist for devs, not for everyone else | **Solo Mode** — no Docker needed. Clone, install, run |

### Who Is This For?

- 🧑‍💻 **Power users** — Full API, SSE streams, chain triggers, custom strategies, recurring tasks
- 🎨 **No-code users** — Connect wallet (Leather or Xverse) → pick a risk template → done
- 🤖 **AI agent builders** — Drop-in [OpenClaw skill](https://github.com/Jubilee-Protocol/Openclaw-Skill-Jubilee) for any agent framework

---

## What It Does for Stacks

### 12 Transaction Builders

Every builder produces **unsigned transactions** with **Stacks-enforced post-conditions**. If the on-chain result doesn't match what was approved, the transaction reverts — enforced by the protocol.

| Builder | Protocol | Action | Post-Conditions |
|---------|----------|--------|-----------------|
| `buildSTXTransfer` | Stacks | Send STX | Exact spend |
| `buildSBTCTransfer` | sBTC | Send sBTC | Exact FT transfer |
| `buildALEXSwap` | ALEX | AMM swap (any pair) | Exact spend + min receive |
| `buildVelarSwap` | Velar | DEX swap | Exact spend + min receive |
| `buildBitflowSwap` | Bitflow | DEX swap | Exact spend + min receive |
| `buildBitflowStake` | Bitflow | STX → stSTX liquid stacking | Exact STX deposit |
| `buildArkadikoSwap` | Arkadiko | swap-x-for-y | Exact spend + min receive |
| `buildZestDeposit` | Zest | Lending pool deposit | Exact FT deposit |
| `buildStackSTX` | PoX-4 | Stack STX (1–12 cycles) | PoX lock |
| `buildDelegateSTX` | PoX-4 | Delegate to stacking pool | PoX delegation |
| `signAndBroadcast` | Core | Sign + broadcast to chain | Hash check vs. gate |
| `waitForConfirmation` | Core | Poll for tx confirmation | — |

### 10+ Read Tools

| Tool | Data Source | What It Returns |
|------|-----------|----------------|
| `getAccountBalances` | Hiro API | STX, sBTC, all SIP-010 token balances |
| `getNetworkInfo` | Hiro API | Block height, congestion, tip hash |
| `getsBTCPegHealth` | Hiro API | Peg ratio, finality depth, health score |
| `getPoxInfo` | Hiro API | Current cycle, reward phase, stacking minimum |
| `getRecentTxHistory` | Hiro API | Last N transactions for a wallet |
| `getProtocolTVL` | Hiro API | TVL for ALEX, Arkadiko, Velar, Bitflow, Zest |
| `captureChainSnapshot` | All above | Full snapshot: wallet + network + peg + pools |
| `getContractSource` | Hiro API | Clarity source code + ABI for any contract |
| `analyzeContract` | Hiro + Claude | LLM security audit of Clarity contracts |
| `getSignerHealth` | Hiro API | Nakamoto signer count, PoX cycle timing |

### 3 AI Agents

| Agent | Role | How It Works |
|-------|------|-------------|
| **Analyst** | Chain analysis | Takes a `ChainSnapshot` → uses Claude to identify risks, opportunities, and context |
| **Risk Gate** | Risk scoring | Rule-based scoring against your `RiskConfig` → returns `PROCEED`, `NEEDS_HUMAN`, `HOLD`, or `REJECT` |
| **Executor** | Sign + broadcast | Verifies transaction hash matches gate approval → signs → broadcasts → confirms |

### 6 Chain Trigger Conditions

| Condition | Example |
|-----------|---------|
| `peg_health_below` | "If sBTC peg drops below 85, swap to STX" |
| `peg_health_above` | "If peg recovers above 95, buy sBTC" |
| `stx_balance_above` | "If balance exceeds 10,000 STX, stake it" |
| `stx_balance_below` | "If balance drops below 100 STX, alert me" |
| `pox_cycle_ending_in` | "If PoX cycle ends in 200 blocks, re-delegate" |
| `congestion_level` | "If congestion is low, execute batch swaps" |

### Recurring Task Intervals

`15m` · `1h` · `6h` · `12h` · `24h` · `7d` · `14d` · `30d`

Example: _"compound my Zest yield every 24 hours"_

---

## Supported Protocols

| Protocol | Read | Write | Actions |
|----------|------|-------|---------|
| **STX** | ✅ | ✅ | Transfer, PoX stacking (1–12 cycles), delegation |
| **sBTC** | ✅ | ✅ | Transfer, peg health monitoring, finality depth |
| **ALEX** | ✅ | ✅ | AMM swaps (any token pair), slippage protection |
| **Velar** | ✅ | ✅ | DEX swaps, pool state, TVL tracking |
| **Bitflow** | ✅ | ✅ | stSTX liquid stacking, DEX swaps |
| **Arkadiko** | ✅ | ✅ | Token swaps, vault monitoring, liquidation alerts |
| **Zest** | ✅ | ✅ | Lending pool deposits for yield |

**Total: 7 protocols, 12 builders, 10+ read tools, 3 agents, 6 trigger types, 8 intervals**

---

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) (or Node.js 18+)
- [Anthropic API key](https://console.anthropic.com)
- A Stacks wallet mnemonic (12-word seed phrase)

### Solo Mode (30 seconds, no Docker)

```bash
git clone https://github.com/NoCodeClarity/NoCodeClarityAI.git
cd NoCodeClarityAI && bun install
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, WALLET_MNEMONIC
# Add: SOLO_MODE=true

bun run swarm:dev  # Orchestrator on :3001
```

### Full Mode (PostgreSQL + vector search)

```bash
git clone https://github.com/NoCodeClarity/NoCodeClarityAI.git
cd NoCodeClarityAI && bun install
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, WALLET_MNEMONIC, DATABASE_URL

docker compose up db -d
cd packages/orchestrator && bun run db:generate && bun run db:migrate && cd ../..
bun run swarm:dev                              # Orchestrator on :3001
cd packages/frontend && npm run dev             # Frontend on :5173
```

Open **http://localhost:5173** → connect Leather or Xverse → pick a strategy → submit your first goal.

---

## Architecture

```
nocodeclarity-ai/
├── packages/frontend/               → React + Vite frontend
│   ├── OnboardingFlow               → Stacks Connect (Leather/Xverse) → strategy → deploy
│   ├── Console                      → 3-panel: portfolio + execution feed + commands
│   ├── Activity                     → Completed task history with Hiro Explorer links
│   ├── Vault                        → STX/sBTC balance cards + yield positions
│   └── WalletProvider               → @stacks/connect context (no seed phrase needed)
│
├── packages/tools/                  → Protocol interactions
│   ├── read/hiro.ts                 → 10 read tools (Hiro API)
│   ├── read/clarity.ts              → Clarity contract analyzer (Hiro + Claude)
│   ├── read/signers.ts              → Nakamoto signer health monitor
│   └── write/builders.ts            → 12 transaction builders (all protocols)
│
├── packages/agents/                 → AI pipeline
│   ├── Analyst                      → LLM-powered chain analysis
│   ├── Risk Gate                    → Rule-based risk scoring
│   └── Executor                     → Sign + broadcast with hash check
│
├── packages/orchestrator/           → Core engine
│   ├── index.ts (StacksSwarm)       → Pipeline coordinator + DB helpers
│   ├── server.ts                    → Hono HTTP + SSE + API routes + SPA serving
│   ├── scheduler.ts                 → Recurring task scheduler
│   ├── triggers.ts                  → Chainhook-style event trigger engine
│   ├── embeddings.ts                → Agent memory (LLM summaries + vectors)
│   ├── sharing.ts                   → Strategy export/import/URL sharing
│   └── db/                          → Drizzle schema + dual-mode DB client
│
├── Dockerfile                       → Railway deployment (Bun runtime)
├── docker-compose.yml               → Local dev: PostgreSQL + pgvector
└── .github/workflows/ci.yml         → CI: typecheck + tests + build
```

---

## Security Model

| Layer | Protection |
|-------|-----------|
| **Post-conditions** | Every transaction has Stacks-enforced post-conditions. Mismatch → revert. |
| **Hash check** | Signed transaction must match the hash the Risk Gate approved. |
| **Risk Gate** | Rule-based scoring with configurable thresholds. Defaults to REJECT on uncertainty. |
| **Kill switch** | `POST /pause` — no auth required, halts ALL active tasks instantly. |
| **Goal sanitization** | 500-char limit, control character stripping, prompt injection defense. |
| **API auth** | All mutating endpoints require `ORCHESTRATOR_SECRET`. |
| **Non-custodial** | Your keys never leave your server. No cloud custody. |
| **Trigger whitelist** | Only 6 validated condition types accepted — no arbitrary code execution. |
| **Rate limits** | Max 20 recurring tasks, max 10 triggers, min 60s cooldown. |
| **Contract validation** | Contract IDs regex-validated before any API call. |

---

## Deployment

### Production (Railway + Netlify)

1. **Backend** — Deploy to [Railway](https://railway.app) from this repo. It auto-detects the `Dockerfile`. Add a PostgreSQL service and set your env vars (`WALLET_MNEMONIC`, `ANTHROPIC_API_KEY`, `DATABASE_URL`).

2. **Frontend** — Connect to [Netlify](https://netlify.com) from this repo:
   - Base directory: `packages/frontend`
   - Build command: `npm run build`
   - Publish directory: `packages/frontend/dist`
   - Update `packages/frontend/public/_redirects` with your Railway URL for API proxy.

3. **Wallet Connect** — Users connect via **Leather** or **Xverse** browser wallet. No seed phrase required — signing happens in the wallet popup via `@stacks/connect`.

### Self-Hosted (Docker)

```bash
docker compose up -d   # Starts PostgreSQL + orchestrator
```

The orchestrator auto-serves the frontend from `packages/frontend/dist/` when built.

---

## Strategy Templates

| Template | Protocols | Risk | Auto-Execute Limit |
|----------|-----------|------|--------------------|
| **Conservative** | Zest lending only | 🛡️ Low | 0.001 BTC |
| **Moderate** | Zest + ALEX + Velar swaps | ⚖️ Medium | 0.01 BTC |
| **Aggressive** | All 7 protocols | 🔥 High | 0.05 BTC |
| **PoX Stacking** | STX → pool delegation | 🛡️ Low | 0.1 BTC |

> **Auto-execute limit** = transactions below this value proceed automatically. Above it → `NEEDS_HUMAN` → you approve in the UI.

Strategies can be **exported, shared via URL, and imported** by other users.

---

## Full API Reference

### Core Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check |
| `GET` | `/stream` | No | SSE event stream (real-time) |
| `POST` | `/pause` | No | **Kill switch** — halt all tasks |

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/tasks` | Yes | List recent tasks (last 50) |
| `GET` | `/tasks/:id` | Yes | Get single task |
| `POST` | `/tasks` | Yes | Submit a new goal |
| `POST` | `/tasks/:id/approve` | Yes | Approve NEEDS_HUMAN task |
| `POST` | `/tasks/:id/reject` | Yes | Reject a task |

### Strategies

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/strategies` | Yes | List strategies |
| `POST` | `/strategies` | Yes | Create strategy |
| `GET` | `/strategies/:id/export` | Yes | Export as shareable JSON |
| `POST` | `/strategies/import` | Yes | Import from JSON or share code |

### Recurring Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/recurring` | Yes | List scheduled tasks |
| `POST` | `/recurring` | Yes | Schedule a recurring goal |
| `DELETE` | `/recurring/:id` | Yes | Cancel a recurring task |

### Chain Triggers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/triggers` | Yes | List triggers |
| `POST` | `/triggers` | Yes | Register a trigger |
| `DELETE` | `/triggers/:id` | Yes | Remove a trigger |

### Analysis & Monitoring

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/analyze/:contractId` | Yes | Clarity contract security audit |
| `GET` | `/signers` | No | Stacks signer health + PoX cycle |

### Examples

```bash
# Submit a goal
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -H "x-orchestrator-secret: $ORCHESTRATOR_SECRET" \
  -d '{ "goal": "swap 100 STX for sBTC on ALEX", "strategyId": "abc-123" }'

# Schedule recurring compounding
curl -X POST http://localhost:3001/recurring \
  -H "Content-Type: application/json" \
  -H "x-orchestrator-secret: $ORCHESTRATOR_SECRET" \
  -d '{ "goal": "compound my Zest yield", "strategyId": "abc", "interval": "24h" }'

# Set a trigger for sBTC peg drop
curl -X POST http://localhost:3001/triggers \
  -H "Content-Type: application/json" \
  -H "x-orchestrator-secret: $ORCHESTRATOR_SECRET" \
  -d '{
    "name": "Hedge on peg drop",
    "condition": { "type": "peg_health_below", "threshold": 85 },
    "goal": "swap my sBTC to STX for safety",
    "strategyId": "abc"
  }'

# Analyze a contract before depositing
curl http://localhost:3001/analyze/SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR.alex-vault \
  -H "x-orchestrator-secret: $ORCHESTRATOR_SECRET"

# Check signer health
curl http://localhost:3001/signers

# Watch the live event stream
curl -N http://localhost:3001/stream
# Events: task:created, task:step, task:needs_human, task:executing, task:complete, task:failed
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key (Haiku) for agent reasoning |
| `WALLET_MNEMONIC` | ✅ | 12-word Stacks wallet seed phrase |
| `DATABASE_URL` | Production | PostgreSQL + pgvector connection string |
| `ORCHESTRATOR_SECRET` | Recommended | API authentication secret |
| `HIRO_API_KEY` | Optional | Hiro API key for higher rate limits |
| `STACKS_NETWORK` | Optional | `mainnet` or `testnet` (default: `testnet`) |
| `SOLO_MODE` | Optional | `true` for zero-config mode (no database) |
| `ORCHESTRATOR_PORT` | Optional | Server port (default: `3001`) |
| `AIBTC_REGISTER` | Optional | `true` to register with the AIBTC network |
| `AIBTC_OPERATOR_X_HANDLE` | Optional | Your X handle for AIBTC registry |

---

## OpenClaw Integration

NoCodeClarity AI works as an [OpenClaw skill](https://github.com/Jubilee-Protocol/Openclaw-Skill-Jubilee) — any AI agent that can run shell commands can use it:

```bash
# Chain snapshot (no orchestrator needed)
npm run stacks-snapshot ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM

# Submit a goal via the orchestrator
npm run stacks-swarm goal "swap 10 STX for sBTC on ALEX" <strategy_id>

# Monitor + approve
npm run stacks-swarm tasks
npm run stacks-swarm approve <task_id>

# Kill switch
npm run stacks-swarm pause
```

Works with Claude Code, Cursor, Windsurf, Dexter, or any agent that reads `SKILL.md`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Wallets | Leather + Xverse (Stacks Connect) |
| Backend | Hono (HTTP + SSE), Bun runtime |
| Database | PostgreSQL + pgvector (Drizzle ORM) or in-memory |
| AI | Claude Haiku (goal classification + chain analysis + contract audits) |
| Blockchain | Stacks.js, Hiro API, PoX-4, Chainhook-style triggers |
| Protocols | ALEX, Velar, Bitflow, Arkadiko, Zest, sBTC, PoX |
| Agent Infra | OpenClaw compatible, AIBTC Network registered |
| Build | Turborepo monorepo |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, security rules, and code style.

## License

MIT — see [LICENSE](LICENSE).

## Built By

**[NoCodeClarity](https://github.com/NoCodeClarity)** — Making Bitcoin DeFi accessible to everyone.

---

> *"The best DeFi experience is the one you don't have to manage."*
