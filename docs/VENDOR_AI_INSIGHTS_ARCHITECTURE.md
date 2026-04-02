# Vendor AI Insights — Backend Architecture

Backend design for the **AI Business Insights** dashboard (tab-based: Demand & Stock, Sales Insight, Return Predictor, Competitor Intelligence). Focus: API design, Prisma storage, AI prompt templates; MVP-level, no heavy ML.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Store dashboard (UI) → Tabs: Demand | Sales | Return | Competitor      │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                    GET (stored snapshot) / POST (run + store)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API: /api/store/ai-insights/{demand|sales|return-predictor|competitor}  │
│  - Auth: authSeller(userId, storeType) → storeId                        │
│  - Query: ?type=electronics|fashion                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ aiInsightsData  │         │ aiInsightsPrompts│         │   aiClient       │
│ getStoreContext │         │ (per-feature     │         │ Gemini / OpenAI │
│ (orders,        │         │  prompt builders)│         │ replaceable      │
│  products,      │         │                  │         │ generateJSON    │
│  ratings, etc.) │         │                  │         │                  │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     ▼
                         Structured JSON per feature
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Prisma → Neon PostgreSQL                                                │
│  VendorDemandPrediction | VendorSalesInsight | VendorReturnPredictor     │
│  VendorCompetitorInsight (payload: Json, runType, analyzedAt)            │
└─────────────────────────────────────────────────────────────────────────┘
```

**Data flow**

- **Initial analysis**: First POST for a store → AI run → result stored as snapshot, `runType: "initial_analysis"`.
- **Stored snapshot**: One row per store per feature; GET returns latest `payload` + `analyzedAt` + `runType`.
- **Relook analysis**: POST again → same pipeline with latest DB data → overwrite snapshot, `runType: "relook_analysis"`.

---

## 2. Prisma Schema (Neon PostgreSQL)

All AI outputs live in Postgres as JSON. One current snapshot per store per feature (upsert on run).

| Model                    | Purpose                         | payload (JSON) |
|--------------------------|---------------------------------|-----------------|
| `VendorDemandPrediction` | Demand & stock prediction       | `demandTrends[]`, `restockSuggestions[]`, `overstockRisks[]`, `summary` |
| `VendorSalesInsight`     | Sales reason analyzer           | `summary`, `top_reasons[]`, `actionable_suggestions[]` |
| `VendorReturnPredictor`  | Return/complaint risk per product | `products[]` (productId, risk, likelyCauses), `summary` |
| `VendorCompetitorInsight`| Competitor comparison           | `summary`, `series[]`, `comparisons[]`, `productComparison[]` (graph-friendly) |

Common fields: `storeId`, `payload`, `runType` (`initial_analysis` | `relook_analysis`), `analyzedAt`.

---

## 3. API Design

Base path: `/api/store/ai-insights/<feature>`. All require seller auth and support `?type=electronics|fashion`.

| Method | Path example | Behavior |
|--------|----------------|----------|
| GET    | `.../demand`   | Return stored snapshot (or `snapshot: null` + message). |
| POST   | `.../demand`   | Run AI with current store data; upsert snapshot; return new snapshot + `analyzedAt` + `runType`. |

- **Demand**: `GET/POST .../demand`
- **Sales**: `GET/POST .../sales`
- **Return predictor**: `GET/POST .../return-predictor`
- **Competitor**: `GET/POST .../competitor`. POST body may include `{ "competitorProducts": [...] }` for comparison; otherwise AI still returns valid structure with “no competitor data” message.

---

## 4. AI Provider (Replaceable)

- **Config**: `AI_INSIGHTS_PROVIDER=gemini|openai`, plus provider-specific keys and model (e.g. `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.0-flash`).
- **Usage**: `lib/aiClient.js` exposes `generateForInsights(userPrompt, systemPrompt, { json })` and `generateJSONForInsights(userPrompt, systemPrompt)`. Swapping provider or model is done via env only.

---

## 5. AI Prompt Templates (Summary)

- **Demand & Stock**  
  Input: orders by month, products with sales/units/stock.  
  Output: `demandTrends[]`, `restockSuggestions[]`, `overstockRisks[]`, `summary` (structured JSON).

- **Sales Insight & Reason Analyzer**  
  Input: orders, revenue, product performance (price, stock, units, ratings, reviews).  
  Output: `summary`, `top_reasons[]` (reason, impact, evidence), `actionable_suggestions[]` (suggestion, priority).

- **Return & Complaint Predictor**  
  Input: products, low ratings, cancellation reasons.  
  Output: `products[]` with `productId`, `productName`, `risk` (low|medium|high), `likelyCauses[]`; plus `summary`.

- **Competitor Intelligence**  
  Input: vendor products + optional `competitorProducts[]`.  
  Output: graph-friendly JSON: `summary`, `series[]` (line/bar), `comparisons[]`, `productComparison[]`.

Templates live in `lib/aiInsightsPrompts.js`; each builds one user prompt; system prompt enforces “JSON only”.

---

## 6. File Map

| File | Role |
|------|------|
| `prisma/schema.prisma` | Models: VendorDemandPrediction, VendorSalesInsight, VendorReturnPredictor, VendorCompetitorInsight |
| `lib/aiClient.js` | Replaceable AI (Gemini/OpenAI), `generateJSONForInsights` |
| `lib/aiInsightsData.js` | `getStoreContext(storeId)` — orders, products, ratings, aggregates |
| `lib/aiInsightsPrompts.js` | Prompt builders and `SYSTEM_JSON` |
| `app/api/store/ai-insights/_shared.js` | `resolveStore`, `getContext`, `runType` |
| `app/api/store/ai-insights/demand/route.js` | GET snapshot, POST run + store |
| `app/api/store/ai-insights/sales/route.js` | Same pattern |
| `app/api/store/ai-insights/return-predictor/route.js` | Same pattern |
| `app/api/store/ai-insights/competitor/route.js` | Same; POST accepts `competitorProducts` |

---

## 7. Constraints Met

- **Structured JSON only** for all four features (no free-text blob).
- **Stored in Neon PostgreSQL** via Prisma.
- **initial_analysis / stored_snapshot / relook_analysis**: single snapshot per feature, `runType` and overwrite on POST.
- **Gemini 3.0 Flash**: use `GEMINI_MODEL` (e.g. `gemini-2.0-flash` today; replace with 3.0 when available); provider is replaceable via `AI_INSIGHTS_PROVIDER`.
- **MVP**: no training or heavy ML; prompt-based analysis only.

Frontend can call GET for each tab to show last snapshot and POST to refresh (relook) with latest data.
