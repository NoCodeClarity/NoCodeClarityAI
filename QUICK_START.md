# NoCodeClarity AI — Quick Start 🚀

Get up and running in under 5 minutes.

## Prerequisites

| Tool | Required | Install |
|------|----------|---------|
| **Bun** | v1.0+ | `curl -fsSL https://bun.sh/install \| bash` |
| **Git** | Any | [git-scm.com](https://git-scm.com) |
| **Wallet** | Leather or Xverse | [leather.io](https://leather.io) / [xverse.app](https://www.xverse.app) |
| **Docker** | Optional (for PostgreSQL) | [docker.com](https://docker.com) |

## 1. Clone & Install

```bash
git clone https://github.com/NoCodeClarity/NoCodeClarityAI.git
cd NoCodeClarityAI
bun install
```

## 2. Configure

```bash
cp .env.example .env
```

Edit `.env` with your keys:
```env
ANTHROPIC_API_KEY=sk-ant-...     # Required — powers the AI agents
WALLET_MNEMONIC="your 24 words"  # Required — server-side signing key
STACKS_NETWORK=testnet           # Start on testnet, switch to mainnet later
SOLO_MODE=true                   # true = no Docker needed (in-memory DB)
```

## 3. Start

**Solo Mode** (fastest — no Docker):
```bash
bun run swarm:dev           # Backend on :3001
```

In a second terminal:
```bash
cd packages/frontend
npm run dev                 # Frontend on :5173
```

**Full Mode** (with PostgreSQL):
```bash
docker compose up db -d
cd packages/orchestrator && bun run db:generate && bun run db:migrate && cd ../..
bun run swarm:dev
cd packages/frontend && npm run dev
```

## 4. Use

1. Open **http://localhost:5173**
2. Click **Connect Wallet** → approve in Leather or Xverse
3. Pick a risk strategy (Conservative / Balanced / Yield)
4. Type a goal:
   - `"Stack 50 STX for 6 PoX cycles"`
   - `"Deposit 100000 sats of sBTC into Zest for yield"`
   - `"Swap 10 STX for sBTC on ALEX"`
5. Review the agent execution in the **Live Feed**
6. Approve or reject from the **Command Panel**

## 5. Explore the Platform

| Page | URL | What It Does |
|------|-----|-------------|
| **Console** | `/` | 3-panel: portfolio + live feed + commands |
| **Activity** | `/activity` | Transaction history with Hiro Explorer links |
| **Vault** | `/vault` | STX/sBTC balances + token positions |
| **Stacking** | `/stacking` | PoX dashboard: solo stack or delegate to pool |
| **Triggers** | `/triggers` | Auto-execute goals on chain conditions |
| **Strategies** | `/strategies` | Browse/import risk-managed DeFi strategies |

## 6. Deploy to Production

### Frontend → Netlify
1. Connect repo to [Netlify](https://netlify.com)
2. Base directory: `packages/frontend`
3. Build command: `npm run build`
4. Publish directory: `packages/frontend/dist`
5. Add `VITE_API_URL` env var pointing to your Railway backend

### Backend → Railway
1. Deploy from repo on [Railway](https://railway.app)
2. It auto-detects the `Dockerfile`
3. Add PostgreSQL service
4. Set env vars: `WALLET_MNEMONIC`, `ANTHROPIC_API_KEY`, `DATABASE_URL`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Cannot find module '@stacks/...'` | Run `bun install` in the repo root |
| Frontend shows "API error" | Ensure orchestrator is running on `:3001` |
| Wallet popup doesn't appear | Install Leather or Xverse browser extension |
| Tests fail with rate limit | Set `HIRO_API_KEY` in `.env` |

---

See [CONTRIBUTING.md](CONTRIBUTING.md) for development details, or the full [README.md](README.md) for architecture.
