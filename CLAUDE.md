# CLAUDE.md

A read-only JSON API for **Bank of Ghana Treasury Bill rates** and **Ghana Stock Exchange (GSE)** data: prices, market indices and plain-English insights. It is TypeScript, Express 5, Mongoose 9 and MongoDB, with an optional Upstash Redis cache.

The API runs on Render at `https://treasury-bills.onrender.com`. A GitHub Actions job (Mon–Sat) keeps the data current. The API server **never scrapes**; it only reads MongoDB.

## Commands

```bash
npm run dev           # API with nodemon (src/app.ts)
npm run build         # tsc -> build/
npm start             # node build/app.js
npm run scrape        # one-off: scrape T-bills + sync GSE, then clear the cache (src/scrape.ts)
npm run gse:backfill  # one-off: import all GSE history, ~7 min (src/backfill-gse.ts)
```

There are no tests or linter. Use `npm run build` as the type check.

## Architecture

There are two entry points:

1. **`src/app.ts`**: the Express API. It sets CORS headers by hand (GET only) and mounts `/api/gse` and then `/api`. `/` returns a JSON list of endpoints, so **update it when you add or change routes**, along with the README.
2. **`src/scrape.ts`**: the scheduled job, run by `.github/workflows/scrape.yml` Mon–Sat at 09:00 UTC (GitHub often starts it hours late; no Sunday run since the GSE doesn't trade at weekends) and on manual dispatch. It runs two independent jobs (`runJob`) so one failing doesn't block the other:
   - **T-bill scrape** (`utils/updateDB.job.ts` → `utils/scrapper.ts`): Puppeteer loads the BoG page and reads `#table_1`, then the rows are upserted on `{days, securityType}`. BoG auctions weekly (results on Friday, issue date the next Monday), so scheduled runs only scrape T-bills on **Saturdays and Mondays** (UTC, `TBILL_DAYS` in `scrape.ts`). Manual (`workflow_dispatch`) and local runs always scrape.
   - **GSE sync** (`utils/gse.sync.ts` → `utils/gse.client.ts`): no browser. It POSTs to the GSE site's wpDataTables `admin-ajax.php` endpoint, using a nonce scraped from the page HTML. Daily mode fetches the newest ~1000 price rows and 30 summaries, which is enough to catch up a missed day. `{ full: true }` pages through everything.
   - After both jobs it writes an HTML summary to `SUMMARY_FILE`, which the workflow emails, and clears the Redis cache.

Layout: `routes/` → `controllers/` → `models/` (Mongoose). `interfaces/` holds the types, and `utils/` holds the scrapers, sync, formatting, periods, insights and cache.

### Data model (MongoDB collections)
- `TBillRates` (`models/rate.model.ts`): **all fields are strings**. Despite its name, `days` holds the **issue date** (the BoG column is "Issue Date", always a Monday, e.g. "05 Oct 2026"), and `securityType` is `"91 DAY BILL"`, `"182 DAY BILL"` or `"364 DAY BILL"`. A TTL index on `updatedAt` deletes rows 30 days after the last scrape that saw them (every upsert bumps `updatedAt`), so rows still on the BoG page never expire.
- `GseStock`: one row per symbol (name, board `Main|ETF|GAX`, listedDate).
- `GseStockPrice`: one row per symbol per trading day, unique on `{symbol, date}`. `close` is the VWAP closing price and `last` is the last trade.
- `GseMarketSummary`: one row per day (gseCI, gseFSI, marketCap in GH¢ million, volume). This data only goes back to July 2023.

All writes are idempotent `bulkWrite` upserts, so re-running the scrape or backfill does no harm.

### Conventions
- Responses look like `{ success: true, data, meta }`. For errors, throw `httpError(status, msg)` from `utils/gse.format.ts` and call `next(error)`; `middleware/ErrorHandler.ts` formats it. The stack trace is only included when `PROD_ENV=development`.
- Dates are UTC midnight and are output as `YYYY-MM-DD` with `isoDate`. Missing numbers are `null`, never `0`.
- GSE symbols are normalised to uppercase letters and digits only (`toSymbol`), because the site spells them inconsistently.
- Periods (`utils/gse.periods.ts`) are `1d 1w 1m 3m 6m ytd 1y 5y max`, counted back from the **latest trading day in the data**, not from today. `/insights` doesn't accept `max`. Exact `from`/`to` dates take precedence over `period`.
- Range change is measured from the last close **before** the range, like a chart header.
- `utils/gse.insights.ts` builds `/gse/insights` and also feeds the daily email. For periods up to `1m` (`COMPARABLE_PERIODS`) it compares market returns with T-bill rates scaled to the same number of days; longer periods list today's rates with `equivalentForPeriod: null`, since only about a month of auctions is stored.

### Caching (`utils/cache.ts`, `middleware/cache.ts`)
- Every GET route uses the `cache()` middleware. The key is `api:` plus the lowercased `originalUrl`, and the TTL is 24h (`CACHE_TTL_SECONDS`).
- It only caches 200 responses and sets an `X-Cache: HIT/MISS` header.
- It fails open: with no Upstash env vars, or if Redis errors, requests go straight to MongoDB.
- `clearCache()` SCANs and deletes only `api:*` keys, never FLUSHALL.

## MCP server (`mcp/`)

A separate ESM package, `lyb-cedi-market`, that exposes the API to Claude over MCP. It uses the **MCP TypeScript SDK v2** (`@modelcontextprotocol/server`, not the v1 `@modelcontextprotocol/sdk`) and zod 4. It only calls the public REST API (`API_BASE_URL`, defaulting to the Render URL) and never touches MongoDB. Live at `https://lyb-cedi-market.onrender.com/mcp`, as its own Render web service with root directory `mcp`. See `mcp/README.md`.

```bash
cd mcp
npm run dev           # stdio from source (src/stdio.ts); npm start runs the build
npm run dev:http      # Streamable HTTP on :3000/mcp (src/http.ts); npm run start:http runs the build
npm run build         # tsc -> mcp/build/
npm run typecheck
```

Layout:
- `src/server.ts`: `createServer()` factory plus the server `INSTRUCTIONS`. Both transports use it.
- `src/stdio.ts` and `src/http.ts`: entry points. HTTP is Express with the SDK's stateless `createMcpHandler`; Host/Origin checks guard `/mcp` only, so `/health` stays open for Render.
- `src/tools/`: `get_tbill_rates`, `list_stocks`, `get_stock`, `get_market`, `get_market_insights`, plus shared zod schemas (`schemas.ts`), response helpers (`format.ts`) and the chart/table/text question (`display.ts`).
- `src/prompts.ts` (`market_brief`, `analyze_stock`, frequencies in `BRIEFS`), `src/resources.ts` (`gse://stocks`, `gse://stocks/{symbol}`), `src/completions.ts`.
- `src/service/`: the REST client (`httpClient.ts`), one method per endpoint (`api.ts`), paths (`endpoints.ts`) and response types (`types.ts`).

Conventions:
- **Never write to stdout** (`console.log`) in the MCP server: over stdio it is the protocol channel. Log with `console.error`.
- Relative imports need `.js` extensions (`nodenext`). Run `npm run typecheck` before calling it done; `tsx` hides these errors.
- **Stateless HTTP builds a new server per request**, so anything that must outlive a request (the `ApiService`, caches, the `fetchOnce` map) lives at module scope, never inside `createServer`.
- Tool and parameter descriptions are what the model reads; keep them specific (valid values, examples, which tool to use instead).
- History responses are sampled to about 60 rows (`sample()`), with the exact change taken from the API's `meta`.
- The display question uses v2 `inputRequired()` (the SDK's legacy shim serves 2025-era clients), checks the client's elicitation capability first, and falls back to `"chart"`. Over stateless HTTP the capability is unknown, so it always falls back to a chart.
- Historical T-bill rates beyond about a month must come only from bog.gov.gh (`BOG_LOOKUP_RULE`, shared by the tool description, instructions and prompts).
- Local registrations (Claude Code user scope and `claude_desktop_config.json`) must use the **absolute node path**: Claude Desktop's PATH resolves `node` to an old nvm version that can't run ESM. After code changes, `npm run build` and start a new session.

## Environment

`.env` (gitignored):
- **Required:** `DB_URL`.
- **Optional:** `PORT` (default 8080), `PROD_ENV`, `CHROME_PATH` (needed for local scraping on macOS), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CACHE_TTL_SECONDS`.

GitHub Actions secrets: `DB_URL`, `MAIL_USERNAME`, `MAIL_PASSWORD` (a Gmail app password), plus the Upstash values. The workflow uses the runner's Chrome (`PUPPETEER_SKIP_DOWNLOAD=true`). Render also needs `PUPPETEER_SKIP_DOWNLOAD=true`.

## Known quirks
- The scrapers depend on external page structure: the BoG `#table_1` column positions, and the GSE wpDataTables table IDs and column order in `GSE_TABLES` and the `toStockPrice`/`toMarketSummary` row layouts. When a scrape breaks, check these first.
- `app.ts` imports `rateLimit` and `getClientIp` and defines `allowlist`, but nothing uses them, so no rate limiting is in place.
- `DB_Connection` doesn't await `mongoose.connect`. That's harmless while connecting, because Mongoose buffers queries until the connection is up. But if the connection fails, the error is only logged: the server stays up, and every query times out after 10s and returns a 500.

## Repo rules
- Never add `Co-Authored-By: Claude` (or any Claude attribution) to commits or PRs.
- Keep the README, the `/` endpoint list in `app.ts` and this file in sync when you change endpoints. If an endpoint's response shape changes, also update `mcp/src/service/types.ts` and the MCP tools that use it.
