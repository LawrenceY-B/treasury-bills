# 💰 Treasury Bill API 💹

Welcome to the **Treasury Bill API**! 🌐

**Base URL:** `https://3cbspe2hyj.us-east-1.awsapprunner.com/api`

**Note:** 🚧 For the time being, the API may not be available (Maximum Requests:8 request in 12 hours😔). However, you can clone the project and provide a port number to run the project locally.

## 🚀 API Requests

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

## 📊 Data Source

The data for this API is obtained by **scraping** the official [Bank of Ghana Treasury Bill Rates](https://www.bog.gov.gh/treasury-and-the-markets/treasury-bill-rates/) webpage.

## 💻 Technology Stack
[![Stack Used](https://skillicons.dev/icons?i=mongodb,typescript,nodejs,express&theme=dark&perline=2)](https://skillicons.dev)

- **Language:** TypeScript
- **Web Scraping:** Puppeteer JS
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
npm run scrape   # scrapes the Bank of Ghana page and saves the rates
```
Each run updates rows that already exist instead of duplicating them (one row per auction date and bill type). Rows are deleted automatically **30 days** after they were first saved.

## ☁️ Deployment (free)

- **Scraper → GitHub Actions.** `.github/workflows/scrape.yml` runs `npm run scrape` every day at 09:00 UTC, using the Chrome preinstalled on GitHub's runners. To trigger it manually, go to **Actions → Scrape T-bill rates → Run workflow**.
  - Add these under **Settings → Secrets and variables → Actions**:
    - `DB_URL`: your MongoDB connection string
    - `MAIL_USERNAME`: the Gmail address that sends the emails and receives them
    - `MAIL_PASSWORD`: a Gmail [app password](https://myaccount.google.com/apppasswords), not your normal password
  - After every run you get an email: the latest rates when it succeeds, or a link to the logs when it fails.
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
