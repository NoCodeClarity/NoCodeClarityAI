# NoCodeClarity AI 🤖⚡

[![Stacks](https://img.shields.io/badge/Stacks-Bitcoin_L2-5546FF)](https://www.stacks.co)
[![sBTC](https://img.shields.io/badge/sBTC-Enabled-f7931a?logo=bitcoin&logoColor=white)](https://www.stacks.co/sbtc)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-purple)](https://github.com/Jubilee-Protocol/Openclaw-Skill-Jubilee)
[![AIBTC](https://img.shields.io/badge/AIBTC-Network-orange)](https://aibtc.dev)

> **Your AI manages Bitcoin yield on Stacks — so you don't have to.**

NoCodeClarity AI is a non-custodial **AI agent swarm** that autonomously manages sBTC yield, PoX stacking, and DeFi operations on the [Stacks](https://stacks.co) blockchain. Tell it what you want in plain English. It handles the rest — risk-gated, fully auditable, with a kill switch always one click away.

---

## Why NoCodeClarity?

| Problem | Solution |
|---------|----------|
| DeFi on Stacks is complex — PoX cycles, sBTC peg monitoring, protocol risks | AI agents handle the complexity for you |
| One bad transaction can drain your wallet | **Risk Gate** blocks anything above your threshold |
| You have to watch the market 24/7 | Agents run continuously, react to chain state in real-time |
| Tools exist for devs, not for everyone else | **Simple Onboarding** — connect wallet, pick a strategy, go |

### Who Is This For?

- 🧑‍💻 **Power users** — Full API, SSE streams, custom strategies, deploy your own
- 🎨 **No-code users** — Connect Leather wallet → pick a risk template → done
- 🤖 **AI agent builders** — Drop-in [OpenClaw skill](https://github.com/Jubilee-Protocol/Openclaw-Skill-Jubilee) for any agent framework

---

## How It Works

Every task runs through a **three-agent pipeline**:

```
You: "Deposit my sBTC for yield"
        │
        ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Analyst    │ →  │  Risk Gate   │ →  │   Executor   │
│              │    │              │    │              │
│ Chain snap-  │    │ Score risk   │    │ Sign + broad-│
│ shot: wallet │    │ against YOUR │    │ cast only if │
│ balance, peg │    │ config. Gate │    │ gate says    │
│ health, net  │    │ decision:    │    │ PROCEED or   │
│ congestion   │    │              │    │ you approve  │
└──────────────┘    │ ✅ PROCEED   │    └──────────────┘
                    │ 🟡 NEEDS_    │
                    │    HUMAN     │
                    │ ⏸️ HOLD      │
                    │ ❌ REJECT    │
                    └──────────────┘
```

**Every transaction has post-conditions.** If the on-chain result doesn't match what was approved, the transaction reverts. This is enforced by the Stacks protocol itself — not just our code.

---

## Supported Protocols

| Protocol | What You Can Do | Status |
|----------|----------------|--------|
| **STX** | Transfer, PoX stacking (1–12 cycles), delegation to pools | ✅ Live |
| **sBTC** | Transfer, peg health monitoring, finality depth tracking | ✅ Live |
| **ALEX** | AMM swaps (any token pair) with slippage protection | ✅ Live |
| **Zest Protocol** | Lending pool deposits for yield | ✅ Live |
| **Arkadiko** | Vault monitoring, liquidation risk alerts | 📡 Read |
| **Velar** | Pool state monitoring, TVL tracking | 📡 Read |
| **Bitflow** | stSTX liquid stacking stats | 📡 Read |

---

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) (or Node.js 18+)
- [Docker](https://docker.com) (for PostgreSQL)
- [Anthropic API key](https://console.anthropic.com)
- A Stacks wallet mnemonic (12-word seed phrase)

### Setup (5 minutes)

```bash
# Clone
git clone https://github.com/NoCodeClarity/NoCodeClarityAI.git
cd NoCodeClarityAI && bun install

# Configure
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, WALLET_MNEMONIC, DATABASE_URL

# Database
docker compose up db -d
cd packages/orchestrator && bun run db:generate && bun run db:migrate && cd ../..

# Launch
bun run swarm:dev          # Orchestrator on :3001
bun run --cwd apps/web dev # Web UI on :3000
```

Open **http://localhost:3000** → connect your Leather wallet → pick a strategy → submit your first goal.

### Solo Mode (No Docker, No Database)

```bash
git clone https://github.com/NoCodeClarity/NoCodeClarityAI.git
cd NoCodeClarityAI && bun install
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, WALLET_MNEMONIC
# Add: SOLO_MODE=true

bun run swarm:dev  # That's it. No Docker, no Postgres.
```

> **Solo mode** uses an in-memory store — data is lost on restart, but you're up in 30 seconds.

---

## Architecture

```
nocodeclarity-ai/
├── apps/web/                → Next.js 14 frontend
│   ├── SimpleOnboarding     → No-code: connect → configure → deploy
│   ├── AdvancedDashboard    → Portfolio, console, goal submission
│   ├── AgentConsole         → Live task feed with approve/reject
│   ├── ActivityPage         → Completed task history
│   └── VaultPage            → Strategy configuration
│
├── packages/tools/          → Protocol interactions
│   ├── read/hiro.ts         → 10 read tools (Hiro API)
│   └── write/builders.ts    → 8 transaction builders
│
├── packages/agents/         → AI agents
│   ├── Analyst              → LLM-powered chain analysis
│   ├── Risk Gate            → Rule-based risk scoring
│   └── Executor             → Sign + broadcast with hash check
│
├── packages/orchestrator/   → Core engine
│   ├── StacksSwarm          → Pipeline coordinator + DB helpers
│   ├── server.ts            → Hono HTTP + SSE + kill switch
│   └── db/schema.ts         → Drizzle + pgvector for agent memory
│
└── docker-compose.yml       → PostgreSQL + pgvector
```

---

## Strategy Templates

| Template | Protocols | Risk | Auto-Execute Limit |
|----------|-----------|------|--------------------|
| **Conservative** | Zest lending only | 🛡️ Low | 0.001 BTC |
| **Moderate** | Zest + ALEX swaps | ⚖️ Medium | 0.01 BTC |
| **Aggressive** | Zest + ALEX + Arkadiko | 🔥 High | 0.05 BTC |
| **PoX Stacking** | STX → pool delegation | 🛡️ Low | 0.1 BTC |

> **Auto-execute limit** = transactions below this value proceed automatically. Above it → `NEEDS_HUMAN` → you approve in the UI.

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

---

## API Reference

### Core Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check |
| `GET` | `/stream` | No | SSE event stream (real-time) |
| `POST` | `/pause` | No | **Kill switch** — halt all tasks |
| `GET` | `/tasks` | Yes | List recent tasks |
| `POST` | `/tasks` | Yes | Submit a new goal |
| `POST` | `/tasks/:id/approve` | Yes | Approve NEEDS_HUMAN task |
| `POST` | `/tasks/:id/reject` | Yes | Reject a task |
| `GET` | `/strategies` | Yes | List strategies |
| `POST` | `/strategies` | Yes | Create strategy |

### Submit a Goal

```bash
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -H "x-orchestrator-secret: $ORCHESTRATOR_SECRET" \
  -d '{
    "goal": "deposit my sBTC for yield",
    "strategyId": "abc-123"
  }'
```

### SSE Stream

```bash
curl -N http://localhost:3001/stream
# Events: task:created, task:step, task:needs_human, task:executing, task:complete, task:failed
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key (Haiku) for agent reasoning |
| `WALLET_MNEMONIC` | ✅ | 12-word Stacks wallet seed phrase |
| `DATABASE_URL` | ✅ | PostgreSQL + pgvector connection string |
| `ORCHESTRATOR_SECRET` | Recommended | API authentication secret |
| `HIRO_API_KEY` | Optional | Hiro API key for higher rate limits |
| `STACKS_NETWORK` | Optional | `mainnet` or `testnet` (default: `testnet`) |
| `SOLO_MODE` | Optional | `true` for zero-config mode (no Postgres) |
| `ORCHESTRATOR_PORT` | Optional | Server port (default: `3001`) |
| `AIBTC_REGISTER` | Optional | `true` to register with the AIBTC network |

---

## Advanced Features

### Recurring Tasks

Schedule goals to run automatically on an interval:

```bash
curl -X POST http://localhost:3001/recurring \
  -H "Content-Type: application/json" \
  -H "x-orchestrator-secret: $ORCHESTRATOR_SECRET" \
  -d '{ "goal": "compound my Zest yield", "strategyId": "abc", "interval": "24h" }'
# Valid intervals: 15m, 1h, 6h, 12h, 24h, 7d, 14d, 30d
```

### Chain Triggers

React to on-chain conditions automatically:

```bash
curl -X POST http://localhost:3001/triggers \
  -H "Content-Type: application/json" \
  -H "x-orchestrator-secret: $ORCHESTRATOR_SECRET" \
  -d '{
    "name": "Hedge on peg drop",
    "condition": { "type": "peg_health_below", "threshold": 85 },
    "goal": "swap my sBTC to STX for safety",
    "strategyId": "abc"
  }'
```

Supported conditions: `peg_health_below`, `peg_health_above`, `stx_balance_above`, `stx_balance_below`, `pox_cycle_ending_in`, `congestion_level`

### Contract Analysis

Analyze any Clarity contract for security risks before interacting:

```bash
curl http://localhost:3001/analyze/SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR.alex-vault
# Returns: riskLevel, summary, findings[], publicFunctions[]
```

### Signer Health

Monitor Nakamoto signer set health and PoX cycle timing:

```bash
curl http://localhost:3001/signers
# Returns: totalSigners, healthPct, currentCycle, blocksUntilCycleEnd, rewardPhase
```

### Strategy Sharing

Export and share strategies with the community:

```bash
# Export → get a share code
curl http://localhost:3001/strategies/abc-123/export

# Import from share code
curl -X POST http://localhost:3001/strategies/import \
  -d '{ "shareCode": "eyJ..." }'
```

---

## OpenClaw Integration

NoCodeClarity AI works as an [OpenClaw skill](https://github.com/Jubilee-Protocol/Openclaw-Skill-Jubilee) — any AI agent that can run shell commands can use it:

```bash
# Chain snapshot (no orchestrator needed)
npm run stacks-snapshot ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM

# Submit a goal via the orchestrator
npm run stacks-swarm goal "stack my STX for 2 cycles" <strategy_id>

# Monitor + approve
npm run stacks-swarm tasks
npm run stacks-swarm approve <task_id>
```

Works with Claude Code, Cursor, Windsurf, Dexter, or any agent that reads `SKILL.md`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | Hono (HTTP + SSE), Bun runtime |
| Database | PostgreSQL + pgvector (Drizzle ORM) |
| AI | Claude Haiku (goal classification + chain analysis) |
| Blockchain | Stacks.js, Hiro API |
| Wallet | Leather (Stacks Connect) |
| Build | Turborepo monorepo |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and code style guidelines.

## License

MIT — see [LICENSE](LICENSE).

## Built By

**[NoCodeClarity](https://github.com/NoCodeClarity)** — Making Bitcoin DeFi accessible to everyone.

Part of the **Jubilee Protocol** ecosystem.

---

> *"The best DeFi experience is the one you don't have to manage."*
