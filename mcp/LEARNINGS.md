# Learning notes: building an MCP server

These are notes from building `lyb-cedi-market`, the MCP server for the Ghana T-bill and GSE API, from an empty folder to a server running on Render. Code excerpts are from this repo.

## 1. What MCP is

MCP (Model Context Protocol) is a standard way for AI apps to use outside tools and data. You write one server, and any MCP app (Claude Code, Claude Desktop, claude.ai, Cursor and others) can use it.

```
┌──────────── Host (Claude Code) ────────────┐
│  LLM  ⇄  MCP Client  ──────────────────────┼──►  MCP Server (mcp/)  ──►  REST API
└────────────────────────────────────────────┘
```

- **Host:** the app the user talks to.
- **Client:** inside the host, one per server. It handles the protocol.
- **Server:** your code. It says what it offers, and does the work when asked.

The conversation is **JSON-RPC**:
1. `initialize`: the two sides agree on a protocol version and capabilities.
2. `tools/list`: the client asks what tools exist, and the server returns each tool's name, description and input schema.
3. `tools/call`: the model picks a tool and arguments, and the server runs it.

**Key point:** the model never sees your code, only the **names, descriptions and schemas**. They decide when and how it calls you.

## 2. Tools, resources, prompts (and instructions)

| | Who triggers it | Example here | In Claude Code |
|---|---|---|---|
| **Tool** | the model decides | `get_stock` | a call in the conversation |
| **Resource** | the user or app attaches it | `gse://stocks/MTNGH` | `@lyb-cedi-market:gse://stocks/MTNGH` |
| **Prompt** | the user picks it | `market_brief` | `/lyb-cedi-market:market_brief quarterly` |

The **server instructions** are different from a prompt. They're sent once at `initialize` and always apply ("use list_stocks for symbols…"). A prompt starts *one* conversation, and only when the user picks it.

In the `/` menu, `(MCP)` after a command is just a label. Don't type it.

## 3. Transports

| | stdio | Streamable HTTP |
|---|---|---|
| Who runs it | the app launches it on your machine | it runs on a server (Render) |
| How the app connects | stdin/stdout pipes | `POST https://…/mcp` |
| Who can use it | only you | anyone with the URL |

**Over stdio, stdout *is* the protocol.** Every stdout line must be a JSON-RPC message, so one `console.log("hi")` breaks the connection, even though the server is running fine. Always log with `console.error` (stderr).

## 4. SDK v1 → v2

v2 is the current line. It splits the old `@modelcontextprotocol/sdk` into separate packages:

| | v1 | v2 |
|---|---|---|
| Package | `@modelcontextprotocol/sdk` | `@modelcontextprotocol/server` (+ `/node`, `/express` adapters) |
| Start stdio | `server.connect(new StdioServerTransport())` | `serveStdio(createServer)` |
| Input schema | raw shape `{ x: z.string() }` | `z.object({ x: z.string() })` |
| Zod | v3 or v4 | **v4.2+** |

v2 takes a **factory** (`createServer`), not a server. Think of it as a recipe and a cake: you give the SDK the recipe, and it bakes a fresh server whenever it needs one. Each server holds one connection's state, so over HTTP every request can get its own. The same factory plugs into stdio and HTTP:

```ts
// src/stdio.ts
void serveStdio(createServer);

// src/http.ts
const handler = createMcpHandler(createServer);
```

Pass `createServer`, not `createServer()`.

## 5. Project setup

- **Its own `package.json`:** the server's dependencies stay apart from the API's, and it can be ESM while the API is CommonJS. It also deploys on its own.
- **`"type": "module"`:** files are ESM, so you use `import`/`export`, have no `__dirname`, and **relative imports need `.js`**: `import { get } from "./api.js"` points at `api.ts`.
- **`tsconfig`:** `module` and `moduleResolution` set to `nodenext`, `strict`, and **`"types": ["node"]`** (TypeScript 6+ no longer picks up `@types/*` on its own).
- **Match `@types/node` to the Node you run** (22 here), or TypeScript will accept APIs that crash at runtime.
- **`tsx` runs code without type-checking.** Always run `npm run typecheck`. One missing `.js` hid a missing export, and the server crashed on startup.

## 6. Layering

```
tools/*.ts      MCP: schemas, descriptions, response shaping
   ↓
service/api.ts  one method per endpoint (getStock, getMarketHistory…)
   ↓
service/httpClient.ts   fetch, timeout, errors
```

`service/` knows nothing about MCP, so it could be reused in a CLI or a dashboard.

**Endpoints:** plain strings for fixed paths, and **functions** for paths with parameters. Forgetting the argument is then a compile error, and encoding happens in one place:

```ts
stock: (symbol: string) => `${STOCKS}/${encodeURIComponent(symbol)}`,
```

Rule: if *some* values need input, make those values functions. Don't turn the whole object into a function.

**Types:** a generic envelope with a discriminated union:

```ts
export type ApiResponse<TData, TMeta = undefined> = ApiSuccess<TData, TMeta> | ApiError;
// after `if (!json.success) throw ...`, TypeScript knows json is ApiSuccess
```

- Pass the type into the generic, as in `get<TBillRate[]>(...)`, instead of casting with `as`.
- **`satisfies` checks a value without widening its type.** It does nothing on `any` (`response.json()` returns `any`).
- **Interfaces are compile-time only.** If the API changes shape, the types silently lie, so update `service/types.ts` together with the API.

## 7. Errors

| Error | Who handles it | What the model sees |
|---|---|---|
| Wrong argument shape | **the SDK**, using zod, before your handler runs | `isError` result: "Input validation error: …" |
| Valid input, but it fails (unknown symbol, timeout) | you | `isError` result with your message |
| Resource read fails | the SDK | a JSON-RPC error (the user asked for it, not the model) |

An `isError` result is a normal result, so the model reads it and can **retry**. Write errors that say what to do next.

Fixes made to `HttpClient.get()`:
- **Wrap only the risky call in each `try`.** One big `try` caught our own "Unknown symbol" error and relabelled it as a parse error.
- **Parse the body before checking `success`,** so the API's message ("Unknown symbol XYZ. See /api/gse/stocks…") reaches the model.
- **`AbortSignal.timeout(90_000)`** handles the timer and cleanup. `abort("text")` rejects with a bare *string* that has no `.message`, so pass an `Error`.

## 8. Tool design

- **Merge tools that answer the same question.** `get_stock` takes optional `period`/`from`/`to` to add history. Keep `list_stocks` separate, because "what's listed?" is a different question, and a tool whose output type changes with its arguments confuses the model.
- **Precompute what's expensive or arithmetic-heavy.** `get_market_insights` (top movers, breadth, unusual volume) would otherwise take about 40 calls and a lot of arithmetic over many rows, which models are unreliable at.
- **Descriptions are the model's only documentation.** Give valid values, examples, and which tool to use instead ("use list_stocks to find symbols").
- **Keep responses small:**
  - strip `_id`, `__v` and timestamps
  - turn numeric strings into numbers
  - sample long histories to about 60 rows, while keeping the exact `change` from the API's `meta`
  - say when rows are sampled (`sampled: true`)
- **`annotations: { readOnlyHint: true }`** tells clients the tool doesn't change anything.
- **Don't let fields collide.** `{ ...detail, history }` overwrote `StockDetail.history`, so the price rows were renamed to `range`.

## 9. Server instructions

```ts
new McpServer({ name: "lyb-cedi-market", ... }, { instructions: INSTRUCTIONS })
```

Use them for guidance that applies across tools: how to present results, which tool to prefer, data limits. A server **can't call another server's tools**. It can only advise the model, so write conditionally: "if a visualization tool is available…".

Keep rules that appear in several places as **one constant**. `BOG_LOOKUP_RULE` (historical T-bill rates come only from bog.gov.gh) is used by the tool description, the instructions and the prompts. Instructions are advice, not a guarantee: the model decides.

## 10. Prompts and completions

```ts
server.registerPrompt("market_brief", { title, description, argsSchema: z.object({ frequency: frequencyArg("...") }) },
    ({ frequency = "weekly" }) => userMessage(`Write the ${label} market brief ...`));
```

- **A prompt returns *messages*,** a ready-made request that names the exact tools, the structure and the length.
- **One table drives the variations.** `BRIEFS` maps each frequency to a period, a label, a `span` and a word limit, and both prompts read it. `satisfies Record<…>` checks every entry while keeping the exact keys.
- **Completions:**
  - Prompt arguments use `completable(schema, (value) => string[])`.
  - Resource template variables use the template's `complete: { symbol }` map.
  - Return **every** match. The SDK caps the list at 100 and fills in `total`/`hasMore`.
  - Return `[]` on failure; never throw.
  - Cache the symbol list, because completion runs on every keystroke.
- **Claude Desktop and Claude Code don't request completions** (0 requests in the logs). Use the **MCP Inspector** to see them work.

## 11. Resources

- **Static:** `registerResource("stocks", "gse://stocks", metadata, readCallback)` gives one fixed URI.
- **Template:** `new ResourceTemplate("gse://stocks/{symbol}", { list, complete })` gives one URI per item. The `list` callback enumerates them, so each stock can be picked from the `@` menu.

## 12. Elicitation (asking the user mid-call)

`get_stock` and `get_market` ask "Chart / Table / Text only?" while the data loads, with chart as the default. The v2 way:

```ts
const answer = inputResponse(ctx.mcpReq.inputResponses, KEY);
if (answer.kind === "elicit") { /* accept → their choice; decline/cancel → chart */ }
if (answer.kind !== "missing" || !supportsForms(server, ctx)) return DEFAULT;
return inputRequired({ inputRequests: { [KEY]: inputRequired.elicit({ message, requestedSchema }) } });
```

- **One API for every client.** On 2025-era clients, the SDK's **legacy shim** turns `inputRequired()` into a real form request, so the deprecated `ctx.mcpReq.elicitInput` isn't needed.
- **Use `inputResponse()`,** which tells declined/cancelled apart from "not asked yet". `acceptedContent()` returns `undefined` for all three, which would ask again forever.
- **Check the capability first.** If the client can't show forms, `inputRequired` rejects the **whole call** (`-32021`).
- **The handler runs again** after the answer. `fetchOnce` keeps the first round's fetch, so the data loads while the question is shown and is fetched once (2 API calls, not 4).
- **Over stateless HTTP** each request is a new server that never saw `initialize`. I expected that to mean "always a chart", but claude.ai sends its capabilities with every request, so the pop-up appeared live. Clients that only declare them at `initialize` get the chart default. Test with the real client before trusting your assumptions.
- **One question can trigger several pop-ups.** "MTN vs the GSE" made two history calls **in parallel**, so each asked, and neither could reuse the other's answer. Fix: one `compare_history` tool for comparisons, so it's one call and one question.
- **Ask once per conversation, with the memory in the model.** A stateless server can't remember an answer or tell users apart, so a server-side "already asked" flag would be forgotten or leak between users. Claude *does* see the whole chat, so the instructions tell it to pass the user's earlier `display` on every later history call.
- **Refresh after editing descriptions.** After changing a tool description, click **Refresh tools list** on claude.ai.
- **Put instructions next to the data.** Even with `display: chart`, Claude sometimes wrote prose instead of a chart. History results now start with a plain sentence ("The user chose a chart. Before your written answer, draw a line chart of …") before the JSON, because the model follows instructions beside the data more reliably than server instructions it read at the start.
- **Test it with a script that plays the client:** answer `elicitation/create` on stdin, and count API calls with a proxy.

## 13. Connecting clients

- **`claude mcp add` saves a launch recipe;** it doesn't install anything. Scopes: `local` (this project, you), `user` (all your projects), `project` (`.mcp.json`, shared with the team).
- **Claude Code and Claude Desktop use separate configs:** `~/.claude.json` and `~/Library/Application Support/Claude/claude_desktop_config.json`.
- **Use the absolute path to `node`.** Apps don't load your shell setup. Desktop put every nvm version on its PATH, oldest first, so `node` meant **v10**, which can't run `import` ("Connection closed").
- **After a code change,** run `npm run build` and start a **new** session, or quit and reopen Desktop.
- **Logs:** `~/Library/Logs/Claude/mcp-server-<name>.log` and `main.log` show every message, which is how the v10 bug was found.

## 14. HTTP and deployment

Split the server so both transports share it:

```
src/server.ts   createServer() + INSTRUCTIONS
src/stdio.ts    serveStdio(createServer)
src/http.ts     Express + createMcpHandler(createServer)
```

- **`createMcpHandler` is stateless:** a new server per request, and it serves 2025-era clients by default. Anything that must outlive a request (`ApiService`, caches, `fetchOnce`) lives at **module scope**, never inside the factory.
- **`toNodeHandler(handler)`** adapts the web-standard handler to Node or Express. With Express, pass `req.body`, because `express.json()` already read the stream:
  ```ts
  app.all("/mcp", hostHeaderValidation(allowedHosts), originValidation(allowedOrigins),
      (req, res) => void mcp(req, res, req.body));
  ```
- **Host check (DNS rebinding):** only accept requests addressed to your hostnames (localhost, `RENDER_EXTERNAL_HOSTNAME`, `ALLOWED_HOSTS`). A bad host gets 403.
- **Origin check:** blocks other *websites* calling `/mcp` from a browser. Requests without an `Origin` header (Claude Code, Desktop) pass.
- **Put the checks on `/mcp` only.** `createMcpExpressApp()` applies them to every route, which could block Render's `/health` check.
- **On Render:** bind to `0.0.0.0` (detected with `RENDER=true`), use the `PORT` it gives you, set `"engines": { "node": ">=22" }`, and shut down cleanly on `SIGTERM`.
- **Render settings:** root directory `mcp`, build `npm install && npm run build`, start `npm run start:http`, health check `/health`, Free instance. Check the plan: it defaulted to a $7 plan.
- **Free tier sleeps,** so the first request can wait for the MCP service *and* the API to wake up.

## 15. Debugging toolkit

- **Raw JSON-RPC over stdio:** pipe `initialize`, `notifications/initialized`, then your calls into `node build/stdio.js`. On macOS, use `perl -e 'alarm 20; exec @ARGV'` instead of `timeout`.
- **MCP Inspector:** `npx @modelcontextprotocol/inspector node build/stdio.js` gives tabs for tools, prompts (with completions) and resources, plus the raw traffic.
- **HTTP with curl:** quote the headers (`-H 'Accept: application/json, text/event-stream'`). Responses come as SSE `data:` lines.
- **A counting proxy** in front of the API proves how many requests a tool really makes.
- **Read the docs for your SDK version.** The npm package name hid that v2 existed, and the types alone missed the shim.

## 16. Gotchas checklist

- [ ] `console.log` in an MCP server breaks stdio
- [ ] Relative imports need `.js`; `tsx` won't tell you, `tsc` will
- [ ] `@types/node` matches the Node version you run
- [ ] The factory is passed, not called: `serveStdio(createServer)`
- [ ] Long-lived state lives at module scope (stateless HTTP)
- [ ] `HttpClient`: parse first, narrow `try` blocks, abort with an `Error`
- [ ] Spread objects don't silently overwrite fields (`history` → `range`)
- [ ] The default base URL is the deployed API, not `localhost`
- [ ] MCP registrations use the absolute `node` path
- [ ] Rebuild and start a new session after changes
- [ ] Don't type `(MCP)` after a slash command
- [ ] Elicitation: check the capability, use `inputResponse()`, expect the handler to re-run
- [ ] Host/Origin checks on `/mcp`, `/health` left open
- [ ] Render: free plan selected, root `mcp`, `0.0.0.0`, `engines`
