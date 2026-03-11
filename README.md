# NoCodeClarity AI

> AI agent swarm for Bitcoin on Stacks. Non-custodial, risk-gated, fully auditable.

## What It Does

NoCodeClarity AI runs a three-agent pipeline for every task:

```
Goal → [Analyst: snapshot] → [Risk Gate: evaluate] → [Executor: sign+broadcast]
```

- **Analyst** captures a real-time chain snapshot (wallet, network, sBTC peg, DeFi protocols)
- **Risk Gate** evaluates the proposed transaction against your risk config
- **Executor** signs and broadcasts only after gate approval

Gate decisions:
- **PROCEED** — auto-execute (below your threshold)
- **NEEDS_HUMAN** — awaits your approval in the UI
- **HOLD** — retry after N blocks
- **REJECT** — blocked

## Architecture

```
apps/web          → Next.js UI (simple + advanced modes)
packages/
  tools           → All Stacks protocol interactions (read + write)
  agents          → Three agents: Analyst, Risk Gate, Executor
  orchestrator    → Pipeline coordinator + HTTP/SSE server
```

## Supported Protocols

| Protocol | Actions |
|----------|---------|
| **Stacks** | STX transfer, PoX stacking, delegation |
| **sBTC** | Transfer, peg health monitoring |
| **ALEX** | AMM swaps (STX/sBTC pairs) |
| **Zest** | Lending pool deposits |
| **Arkadiko** | Vault monitoring, liquidation risk alerts |
| **Bitflow** | stSTX liquid staking stats |
| **Velar** | Pool state monitoring |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/NoCodeClarity/NoCodeClarityAI.git
cd NoCodeClarityAI
bun install

# 2. Configure
cp .env.example .env
# Edit .env: add ANTHROPIC_API_KEY, WALLET_MNEMONIC, DATABASE_URL

# 3. Start Postgres (pgvector)
docker compose up db -d

# 4. Run migrations
cd packages/orchestrator && bun run db:generate && bun run db:migrate && cd ../..

# 5. Start orchestrator
bun run swarm:dev

# 6. Start web UI (in another terminal)
bun run --cwd apps/web dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key for agent reasoning |
| `WALLET_MNEMONIC` | ✅ | 12-word Stacks wallet mnemonic |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `HIRO_API_KEY` | Optional | Hiro API key for higher rate limits |
| `STACKS_NETWORK` | Optional | `mainnet` or `testnet` (default: testnet) |
| `ORCHESTRATOR_SECRET` | Optional | Secret for API authentication |
| `AIBTC_REGISTER` | Optional | Set to `true` to register with AIBTC network |

## Strategy Templates

| Template | Protocols | Risk Level |
|----------|-----------|------------|
| Conservative | Zest lending only | 🛡️ Low |
| Moderate | Zest + ALEX LP | ⚖️ Medium |
| Aggressive | Zest + ALEX + Arkadiko | 🔥 High |
| PoX Stacking | Stacks PoX delegation | 🛡️ Low |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/stream` | SSE event stream |
| `GET` | `/tasks` | List tasks (last 50) |
| `POST` | `/tasks` | Create task |
| `POST` | `/tasks/:id/approve` | Approve NEEDS_HUMAN task |
| `GET` | `/strategies` | List strategies |
| `POST` | `/strategies` | Create strategy |
| `POST` | `/pause` | Kill switch (no auth) |

## License

MIT
