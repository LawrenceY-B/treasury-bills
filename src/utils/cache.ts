import { Redis } from "@upstash/redis";

export const CACHE_PREFIX = "api:";
export const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS) || 24 * 60 * 60;

export const cacheEnabled = () => Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

let client: Redis | null = null;
const getClient = (): Redis | null => {
  if (!cacheEnabled()) return null;
  // we store JSON strings ourselves, so don't let the client re-parse them on read
  client ??= new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    automaticDeserialization: false,
  });
  return client;
};

let errorLogged = false;
const logOnce = (err: unknown) => {
  if (errorLogged) return;
  errorLogged = true;
  console.error("Redis error (serving without cache):", err instanceof Error ? err.message : String(err));
};

export const getCached = async (key: string): Promise<string | null> => {
  try {
    return (await getClient()?.get<string>(key)) ?? null;
  } catch (err) {
    logOnce(err);
    return null;
  }
};

export const setCached = async (key: string, value: string, ttl = CACHE_TTL_SECONDS) => {
  try {
    await getClient()?.set(key, value, { ex: ttl });
  } catch (err) {
    logOnce(err); // a failed write only means the next request misses
  }
};

// Delete every cached API response (only our prefix, never FLUSHALL)
export const clearCache = async (): Promise<number> => {
  const c = getClient();
  if (!c) return 0;
  let deleted = 0;
  let cursor: string | number = 0;
  do {
    const [next, keys]: [string | number, string[]] = await c.scan(cursor, { match: `${CACHE_PREFIX}*`, count: 100 });
    if (keys.length) deleted += await c.del(...keys);
    cursor = next;
  } while (String(cursor) !== "0");
  return deleted;
};
