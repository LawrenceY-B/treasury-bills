# 💰 Ghana Treasury Bill & Stock Exchange API 💹

Welcome! 🌐 This API serves **Bank of Ghana Treasury Bill rates** and **Ghana Stock Exchange (GSE)** prices, market indices and plain-English insights.

**Base URL:** `https://treasury-bills.onrender.com/api`

**Note:** 🚧 The API is hosted on Render's free tier, so it sleeps when idle. The first request after a quiet spell can take 30–60 seconds; after that it's fast. You can also run it locally (see below).

**Examples:**
- `https://treasury-bills.onrender.com/api/get-tbill?days=91`
- `https://treasury-bills.onrender.com/api/gse/insights?period=1m`

Open the base URL without `/api` to get a JSON list of every endpoint.

## 🚀 API Requests: Treasury Bills

### 1. Get All Treasury Bills
- **Endpoint:** `/get-all-tbill`
- **Method:** `GET`
- **Description:** Retrieve information about all available Treasury Bills.

### 2. Get Treasury Bills by Days
- **Endpoint:** `/get-tbill`
- **Method:** `GET`
- **Query Parameter:**
  - `days` (Accepted values: 91, 182, 364)
- **Description:** Retrieve Treasury Bills based on the specified number of days.

## 📈 API Requests: Ghana Stock Exchange

Conventions for every `/api/gse` endpoint:
- **Response shape:** always `{ "success": true, "data": ..., "meta": ... }`.
- **Errors:** `{ "success": false, "message": "..." }` with a 400 or 404 status.
- **Values:** prices are in **GH¢**, dates are `YYYY-MM-DD`, and numbers are real numbers, not strings.
- **Missing values:** `null` (e.g. no bid that day).
- **Symbols:** case-insensitive, so `mtngh` works the same as `MTNGH`.

| Endpoint | What you get |
|---|---|
| `GET /api/gse/stocks` | Every stock that traded on the latest day: name, price, change, volume. Add `?all=true` for every symbol in the history, including delisted ones |
| `GET /api/gse/stocks/{symbol}` | Company details plus the latest quote (open, close, last, bid, ask, 52-week high/low, volume) |
| `GET /api/gse/stocks/{symbol}/history` | Daily prices, **oldest first**, ready for a chart. Query: `period` (see below, default `1y`). History goes back to **2007** for older stocks |
| `GET /api/gse/market` | Latest GSE Composite Index, Financial Stock Index, market cap and volume, each with its daily change |
| `GET /api/gse/market/history` | Daily market summaries. Same `period` query (index data starts July 2023) |
| `GET /api/gse/insights` | What the numbers mean, as figures plus a `summary` of plain-English sentences. Query: `period` (default `1m`, every period except `max`) |

### 📊 Periods (like the range buttons on a chart)
`1d` · `1w` · `1m` · `3m` · `6m` · `ytd` · `1y` · `5y` · `max`

Each range counts back from the **latest trading day**, so over a weekend `1d` still returns Friday.
- `/api/gse/stocks/MTNGH/history?period=6m` → MTN Ghana's last 6 months of daily prices.
- `meta.change` holds the change over the range, e.g. `{ "from": 5.8, "to": 6.45, "changePercent": 11.21 }`, for a chart header like "+11.21% past 6 months".
- **Exact dates** (e.g. for backtesting): use `from` and `to` (`YYYY-MM-DD`) instead. They override `period`.
- **Row cap:** `limit` (max 10,000) keeps only the most recent N rows.

### What the market numbers mean
- **GSE Composite Index (`gseCI`):** tracks all listed stocks. It's the "is the market up or down" number.
- **GSE Financial Stock Index (`gseFSI`):** tracks only banks and other financial stocks.
- **Market cap (`marketCapMillion`):** the total value of all listed companies, in millions of GH¢.
- **Volume:** shares traded that day.

### Price fields (`/stocks/{symbol}/history`)
| Field | Meaning |
|---|---|
| `open` | Opening price |
| `close` | Closing price (volume-weighted average price, VWAP), the official daily price |
| `last` | Last traded price |
| `previousClose` | Previous day's closing price |
| `change`, `changePercent` | `close` minus `previousClose`, in GH¢ and in % |
| `bid`, `ask` | Best buy and sell orders at the close |
| `volume`, `value` | Shares traded, and GH¢ traded |
| `yearHigh`, `yearLow` | 52-week range |

> The GSE doesn't publish a daily high and low per stock, so there are no `high`/`low` fields.

### Example: `/api/gse/insights?period=1m`
```json
{
  "success": true,
  "data": {
    "period": "1m",
    "from": "2026-09-08",
    "to": "2026-10-08",
    "summary": [
      "The market (GSE Composite Index) rose +2.1% over the past month, to 14,024.18.",
      "Banks and financials (GSE-FSI) fell -0.8%, lagging the overall market.",
      "24 stocks rose, 9 fell and 7 were unchanged.",
      "For comparison, the 364 day T-bill pays 9.8018% a year, about 0.81% over the same 30 days, versus +2.1% for the market."
    ],
    "market": { "gseCI": { "value": 14024.18, "changePercent": 2.1 } },
    "topGainers": [{ "symbol": "…", "from": 1.2, "to": 1.5, "changePercent": 25 }],
    "topLosers": [],
    "mostTraded": [],
    "unusualVolume": [],
    "near52WeekHigh": [],
    "near52WeekLow": [],
    "tBills": [{ "tenor": "91 day", "interestRate": 4.6413, "equivalentForPeriod": 0.38 }]
  }
}
```
*(Numbers here are illustrative.)*

### 🔌 Using the data with FIX
The price fields map onto FIX Market Data (`35=W` snapshot) entries:

| API field | FIX |
|---|---|
| `symbol` | `55` Symbol |
| `bid` | `269=0` Bid |
| `ask` | `269=1` Offer |
| `last` | `269=2` Trade |
| `open` | `269=4` Opening price |
| `close` | `269=5` Closing price |
| `volume` | `269=B` Trade volume |

Prices go in `270` (MDEntryPx) and the date in `272` (MDEntryDate, `YYYYMMDD`).

## 📊 Data Sources

- **Treasury Bills:** scraped from the official [Bank of Ghana Treasury Bill Rates](https://www.bog.gov.gh/treasury-and-the-markets/treasury-bill-rates/) page.
- **Stock exchange:** read from the data tables on the [Ghana Stock Exchange trading data](https://gse.com.gh/trading-and-data/) and [listed companies](https://gse.com.gh/listed-companies/) pages.

## 💻 Technology Stack
[![Stack Used](https://skillicons.dev/icons?i=mongodb,typescript,nodejs,express&theme=dark&perline=2)](https://skillicons.dev)

- **Language:** TypeScript
- **Web Scraping:** Puppeteer (T-bills), plain HTTP requests (GSE)
- **Framework:** Express
- **Database:** MongoDB

## 🚀 How to Run Locally

### Prerequisites
- **Node.js 22.12+**
- **Google Chrome**, only needed for scraping. Point `CHROME_PATH` at it, or leave that unset to use the Chrome Puppeteer downloads on `npm install`.
- A **MongoDB** database, e.g. a free MongoDB Atlas cluster

### Steps

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/LawrenceY-B/treasury-bills.git
   cd treasury-bills
   npm install
   ```

2. Create a `.env` file in the project root:
   ```env
   PORT=8080
   DB_URL=mongodb://<user>:<password>@<host1>:27017,<host2>:27017,<host3>:27017/TBill-db?ssl=true&replicaSet=<replica-set>&authSource=admin
   PROD_ENV=development
   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   ```
   - `PORT`: the port the API listens on. Defaults to `8080`.
   - `DB_URL`: your MongoDB connection string.
   - `PROD_ENV`: when set to `development`, error responses include the stack trace.
   - `CHROME_PATH` (optional): the Chrome the scraper should launch. The example is the macOS path.

   > 💡 **`querySrv ENOTFOUND` error?** Some routers can't resolve the `mongodb+srv://` format. In Atlas, go to **Connect → Drivers** and copy the **standard connection string** (`mongodb://host1,host2,host3/...`) instead, as shown above.

3. Start the development server (auto-reloads on changes):
   ```bash
   npm run dev
   ```

4. Or build and run the compiled version (this is what a host should run):
   ```bash
   npm run build   # compiles TypeScript into build/
   npm start
   ```

### 🔄 How the data stays fresh
The API server only reads from MongoDB. Scraping is a separate one-off command:
```bash
npm run scrape        # T-bill rates + the last ~3 weeks of GSE data
npm run gse:backfill  # one-off: import all GSE history (~185k rows, takes ~7 minutes)
```
Each run updates rows that already exist instead of duplicating them. T-bill rows are deleted automatically **30 days** after they were first saved. GSE data is kept permanently.

## ☁️ Deployment (free)

- **Scraper → GitHub Actions.** `.github/workflows/scrape.yml` runs `npm run scrape` (T-bills + GSE) every day at 09:00 UTC, using the Chrome preinstalled on GitHub's runners. To trigger it manually, go to **Actions → Scrape T-bill rates and GSE data → Run workflow**.
  - Add these under **Settings → Secrets and variables → Actions**:
    - `DB_URL`: your MongoDB connection string
    - `MAIL_USERNAME`: the Gmail address that sends the emails and receives them
    - `MAIL_PASSWORD`: a Gmail [app password](https://myaccount.google.com/apppasswords), not your normal password
  - After every run you get an email. On success it has the latest T-bill rates, the GSE indices, the day's top movers and a short summary. On failure it says what broke and links to the logs.
  - GitHub turns off scheduled workflows on public repos after 60 days without commits. Re-enable it from the Actions tab.
- **API → any Node host**, e.g. a free Render web service:
  - Build command: `npm install && npm run build`
  - Start command: `npm start`
  - Environment variables: `DB_URL`, plus `PUPPETEER_SKIP_DOWNLOAD=true` (the API never launches Chrome, so this skips a ~150MB download)
  - It can sleep when idle, because the scraping runs elsewhere. Expect the first request after a sleep to take 30–60 seconds.
- **MongoDB Atlas → Network Access:** allow `0.0.0.0/0`, since GitHub's and the host's IP addresses change.

## 📞 Contact

- Email: [lawrencekybj@gmail.com]
- GitHub: [LawrenceY-B](https://github.com/LawrenceY-B)
