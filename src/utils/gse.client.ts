// Client for the Ghana Stock Exchange website's data tables (wpDataTables).
// The tables load their rows from admin-ajax.php, which needs a nonce from the page HTML.

const BASE = "https://gse.com.gh";
const HEADERS = { "User-Agent": "Mozilla/5.0 (treasury-bills API)" };

export const GSE_TABLES = {
  stockPrices: { id: 39, page: "/trading-and-data/", columns: 14 },
  marketSummary: { id: 47, page: "/trading-and-data/", columns: 7 },
  mainBoard: { id: 34, page: "/listed-companies/", columns: 7 },
  etfs: { id: 35, page: "/listed-companies/", columns: 7 },
  gax: { id: 36, page: "/listed-companies/", columns: 7 },
};
type Table = (typeof GSE_TABLES)[keyof typeof GSE_TABLES];

const pages = new Map<string, string>();

const getNonce = async (table: Table) => {
  if (!pages.has(table.page)) {
    const res = await fetch(BASE + table.page, { headers: HEADERS });
    if (!res.ok) throw new Error(`GSE ${table.page} returned ${res.status}`);
    pages.set(table.page, await res.text());
  }
  const match = pages
    .get(table.page)!
    .match(new RegExp(`name="wdtNonceFrontendEdit_${table.id}" value="([^"]+)"`));
  if (!match) throw new Error(`No nonce for GSE table ${table.id}, the page layout may have changed`);
  return match[1];
};

// Fetches rows newest first (sorted by the table's row id)
export const fetchTable = async (table: Table, start = 0, length = 1000) => {
  const body = new URLSearchParams({
    draw: "1",
    start: String(start),
    length: String(length),
    "order[0][column]": "0",
    "order[0][dir]": "desc",
    wdtNonce: await getNonce(table),
  });
  for (let c = 0; c < table.columns; c++) {
    body.append(`columns[${c}][data]`, String(c));
    body.append(`columns[${c}][searchable]`, "true");
    body.append(`columns[${c}][orderable]`, "true");
    body.append(`columns[${c}][search][value]`, "");
  }
  const res = await fetch(
    `${BASE}/wp-admin/admin-ajax.php?action=get_wdtable&table_id=${table.id}`,
    { method: "POST", headers: HEADERS, body }
  );
  if (!res.ok) throw new Error(`GSE table ${table.id} returned ${res.status}`);
  const json = (await res.json()) as { data: string[][]; recordsTotal: string | number };
  return { rows: json.data, total: Number(json.recordsTotal) };
};

// Cells can contain HTML (e.g. links on the listed-companies page)
export const cleanText = (value: string | null | undefined) =>
  (value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

// The site spells some symbols inconsistently ("PBC**", "SCB PREF", "SCB-PREF"), so keep letters and digits only
export const toSymbol = (value: string | null | undefined) =>
  cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g, "");

// "1,638,218.00" -> 1638218, "" -> null
export const toNumber = (value: string | null | undefined) => {
  const cleaned = cleanText(value).replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

// "08/10/2026" (dd/mm/yyyy) -> 2026-10-08T00:00:00Z
export const toDate = (value: string | null | undefined) => {
  const match = cleanText(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
};
