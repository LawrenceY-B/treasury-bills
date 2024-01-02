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

1. Clone the repository:
git clone [https://github.com/LawrenceY-B/treasury-bills.git](https://github.com/LawrenceY-B/treasury-bills.git)

2. Navigate to the project directory:
cd treasury-bills
   
3. Install dependencies:
npm install

4.  Provide a **port number** to run the project.

5. Start the development server:
npm run dev

## 📞 Contact

- Email: [lawrencekybj@gmail.com]
- GitHub: [LawrenceY-B](https://github.com/LawrenceY-B)
