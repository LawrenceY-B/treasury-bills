import { NextFunction, Request, Response } from "express";
import { CACHE_PREFIX, CACHE_TTL_SECONDS, cacheEnabled, getCached, setCached } from "../utils/cache";

// Stock symbols are case-insensitive, so /stocks/mtngh and /stocks/MTNGH share one entry
const cacheKey = (req: Request) => `${CACHE_PREFIX}${req.originalUrl.toLowerCase()}`;

// Fails open: if Redis is off or down, the request goes straight to the controller
export const cache = (ttl = CACHE_TTL_SECONDS) => async (req: Request, res: Response, next: NextFunction) => {
  const key = cacheKey(req);
  const hit = await getCached(key);
  if (hit) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).send(hit);
  }

  const json = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode === 200 && cacheEnabled()) {
      res.setHeader("X-Cache", "MISS");
      void setCached(key, JSON.stringify(body), ttl);
    }
    return json(body);
  };
  next();
};
