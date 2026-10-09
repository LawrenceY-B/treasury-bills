# 💰 Ghana Treasury Bill & Stock Exchange API 💹

An API for **Bank of Ghana Treasury Bill rates** and **Ghana Stock Exchange (GSE)** prices, market indices and plain-English insights.

**Base URL:** `https://treasury-bills.onrender.com/api`

> 🚧 Hosted on Render's free tier, so the first request after a quiet spell can take 30–60 seconds.

Open the base URL without `/api` to get a JSON list of every endpoint.

## 🚀 Endpoints

All endpoints are `GET` and return `{ "success": true, "data": ..., "meta": ... }`. Prices are in GH¢ and dates are `YYYY-MM-DD`.

### Treasury Bills
| Endpoint | What you get |
|---|---|
| `/get-all-tbill` | All available Treasury Bill rates |
| `/get-tbill?days=91` | Rates for one tenor (`91`, `182` or `364`) |

### Stock Exchange
| Endpoint | What you get |
|---|---|
| `/gse/stocks` | Every stock that traded on the latest day. Add `?all=true` for every symbol ever listed |
| `/gse/stocks/{symbol}` | Company details and latest quote, e.g. `/gse/stocks/MTNGH` |
| `/gse/stocks/{symbol}/history` | Daily prices, oldest first (back to 2007 for older stocks) |
| `/gse/market` | Latest GSE Composite Index, Financial Stock Index, market cap and volume |
| `/gse/market/history` | Daily market summaries (from July 2023) |
| `/gse/insights` | Plain-English summary of market moves, top gainers and losers, and a comparison with T-bill rates |

**Periods:** history and insights take `?period=` with `1d`, `1w`, `1m`, `3m`, `6m`, `ytd`, `1y`, `5y` or `max` (insights has no `max`). For exact dates use `?from=YYYY-MM-DD&to=YYYY-MM-DD` instead. Add `limit` to keep only the most recent N rows.

Example: `/gse/stocks/MTNGH/history?period=6m`

Symbols are case-insensitive, and missing values are `null`. Errors look like `{ "success": false, "message": "..." }`.

## ⚡ Caching (optional)

Responses are cached in Redis for 24 hours, and the daily scrape clears the cache. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from a free [Upstash](https://upstash.com) database to turn it on. Without them the API reads straight from MongoDB.

Check it with `curl -i <url>`: the `X-Cache` header is `MISS` the first time and `HIT` after.

## 💻 Run Locally

You need **Node.js 22.12+**, a **MongoDB** database (e.g. a free Atlas cluster) and **Google Chrome** (only for scraping).

```bash
git clone https://github.com/LawrenceY-B/treasury-bills.git
cd treasury-bills
npm install
```

Create a `.env` file:
```env
PORT=8080
DB_URL=mongodb://<user>:<password>@<host>/<db>
PROD_ENV=development
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```
`CHROME_PATH` and the two Upstash values are optional.

```bash
npm run dev           # start the API with auto-reload
npm run scrape        # fetch the latest T-bill rates and GSE data
npm run gse:backfill  # one-off: import all GSE history (takes ~7 minutes)
```

For production, run `npm run build` then `npm start`.

## ☁️ Deployment

- **Scraper:** a GitHub Actions workflow (`.github/workflows/scrape.yml`) runs every day at 09:00 UTC and emails a summary. Add these repo secrets: `DB_URL`, `MAIL_USERNAME`, `MAIL_PASSWORD` (a Gmail [app password](https://myaccount.google.com/apppasswords)), and optionally the two Upstash values.
- **API:** any Node host, e.g. Render. Build with `npm install && npm run build`, start with `npm start`, and set `DB_URL`, `PUPPETEER_SKIP_DOWNLOAD=true` and optionally the two Upstash values.

## 📊 Data Sources

- **Treasury Bills:** [Bank of Ghana Treasury Bill Rates](https://www.bog.gov.gh/treasury-and-the-markets/treasury-bill-rates/)
- **Stock exchange:** [GSE trading data](https://gse.com.gh/trading-and-data/) and [listed companies](https://gse.com.gh/listed-companies/)

## 💻 Built With

TypeScript · Express · MongoDB · Puppeteer · Upstash Redis
