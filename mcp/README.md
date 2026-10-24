# lyb-cedi-market MCP server

An [MCP](https://modelcontextprotocol.io) server that lets Claude and other MCP clients use the Ghana Treasury Bill & Stock Exchange API: T-bill rates, GSE prices and indices, and plain-English market insights.

**URL:** `https://lyb-cedi-market.onrender.com/mcp`

> Hosted on Render's free tier, so the first request after a quiet spell can take a minute while the server (and the API behind it) wakes up.

New to MCP? [`LEARNINGS.md`](LEARNINGS.md) walks through how this server was built, from the concepts to deployment.

## Connect

**Claude Code**
```bash
claude mcp add --transport http lyb-cedi-market https://lyb-cedi-market.onrender.com/mcp
```

**claude.ai or Claude Desktop:** Settings → Connectors → Add custom connector, and paste the URL.

## What it offers

### Tools
| Tool | What it does |
|---|---|
| `get_tbill_rates` | T-bill rates from recent auctions, optionally for one tenor (`91`, `182` or `364`) |
| `list_stocks` | Every stock that traded on the latest day, or every symbol ever listed (`all: true`) |
| `get_stock` | One stock's details and latest quote; add `period` (or `from`/`to`) for its price history and % change |
| `get_market` | GSE Composite and Financial indices, market cap and volume; add `period` for their history |
| `get_market_insights` | Whole-market analysis: summary, top gainers and losers, unusual volume, 52-week highs and lows |

Periods are `1d`, `1w`, `1m`, `3m`, `6m`, `ytd`, `1y`, `5y` or `max` (insights has no `max`). Long histories are sampled down to about 60 rows; the % change is still exact.

### Prompts
| Prompt | Arguments |
|---|---|
| `market_brief` | `frequency`: weekly (default), monthly, quarterly, semi-annual, annual or year-to-date |
| `analyze_stock` | `symbol`, plus an optional `frequency` |

In Claude Code: `/lyb-cedi-market:market_brief quarterly` or `/lyb-cedi-market:analyze_stock GCB monthly`.

### Resources
- `gse://stocks`: every listed symbol, with company name and board
- `gse://stocks/{symbol}`: one stock's details and latest quote

### Charts
When a history tool runs, clients that support forms ask whether you want a **chart** (default), a **table** or **text only**. Other clients get a chart.

The API only keeps about a month of T-bill auctions. For longer comparisons the server tells the model to take rates only from the [Bank of Ghana](https://www.bog.gov.gh/treasury-and-the-markets/treasury-bill-rates/), or skip the comparison.

## Run locally

Needs **Node.js 22+**.

```bash
cd mcp
npm install
npm run build
```

**stdio** (Claude launches it on your machine). Use the absolute path to `node`, since apps don't load your shell's PATH:
```bash
claude mcp add lyb-cedi-market -- "$(which node)" "$(pwd)/build/stdio.js"
```

**HTTP**
```bash
npm run dev:http                  # http://127.0.0.1:3000/mcp, with auto-compile via tsx
npm run start:http                # the built version
```

| Script | Does |
|---|---|
| `npm run dev` / `npm start` | stdio server (source / built) |
| `npm run dev:http` / `npm run start:http` | HTTP server (source / built) |
| `npm run typecheck` | `tsc --noEmit` |

**Debug** with the MCP Inspector: `npx @modelcontextprotocol/inspector node build/stdio.js`.

### Environment
| Variable | Default | Used for |
|---|---|---|
| `API_BASE_URL` | `https://treasury-bills.onrender.com` | The REST API to call, e.g. `http://localhost:8080` |
| `PORT` | `3000` | HTTP port |
| `HOST` | `127.0.0.1` (`0.0.0.0` on Render) | HTTP bind address |
| `ALLOWED_HOSTS` | localhost names + Render's hostname | Extra comma-separated hostnames `/mcp` accepts |
| `ALLOWED_ORIGINS` | localhost names | Extra comma-separated browser origins `/mcp` accepts |

## Deployment (Render)

A web service with root directory `mcp`, build `npm install && npm run build`, start `npm run start:http` and health check `/health`. No environment variables are needed. It redeploys when files in `mcp/` change on `main`.

## Built with

TypeScript · MCP TypeScript SDK v2 · Express · Zod
