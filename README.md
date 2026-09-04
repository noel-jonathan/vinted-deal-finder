# Vinted Deal Hunter & Gemini AI Analyzer

A complete, production-grade Python application that scrapes secondhand listings from Vinted, appraises them against secondary market resale comps using Google Gemini 2.5 Flash, and highlights underpriced gems and profitable resale opportunities.

---

## Architecture Overview

```
                   ┌──────────────────────────────────────┐
                   │             User CLI                 │
                   │ (main.py - query, min_score, domain) │
                   └──────────────────┬───────────────────┘
                                      │
                                      ▼
                   ┌──────────────────────────────────────┐
                   │         scraper.py                   │
                   │ - Session warmup & cookie management │
                   │ - Polite rate limiting & jitter      │
                   │ - Normalizes Vinted API / scraper    │
                   └──────────────────┬───────────────────┘
                                      │  List[VintedItem]
                                      ▼
                   ┌──────────────────────────────────────┐
                   │         analyzer.py                  │
                   │ - Google GenAI SDK (gemini-2.5-flash)│
                   │ - Structured Pydantic response schema│
                   │ - Secondhand market appraisal engine │
                   └──────────────────┬───────────────────┘
                                      │  List[AnalyzedItem]
                                      ▼
                   ┌──────────────────────────────────────┐
                   │         Filter & Presentation        │
                   │ - Filters deal_score >= min_score    │
                   │ - Rich terminal table with badges    │
                   │ - Exports to best_deals.json         │
                   └──────────────────────────────────────┘
```

---

## Features

- **Resilient Vinted Scraping (`scraper.py`)**:
  - Automatic session warmup establishing browser cookies.
  - Randomized request delays (`1.5s` - `3.0s`) to respect Vinted rate limits.
  - Flexible support for regional Vinted domains (`vinted.co.uk`, `vinted.fr`, `vinted.de`, `vinted.com`).
  - Graceful fallback to built-in realistic mock data when testing offline or when Cloudflare captcha blocks datacenter IPs.
- **Gemini 2.5 Flash Secondhand Appraiser (`analyzer.py`)**:
  - Uses the official `google-genai` SDK.
  - Native Pydantic structured output (`DealAnalysis`).
  - Estimates secondary market value based on brand equity, vintage rarity, condition, and seller descriptions.
  - Flags flaws, stains, missing hardware, or wear mentioned in text.
  - Computes net resale margin (factoring in realistic marketplace fees).
- **Interactive CLI & Reporting (`main.py`)**:
  - Rich colored terminal output with score badges and direct links.
  - Automatic export to `best_deals.json`.

---

## Quickstart & Execution Instructions

### 1. Prerequisites
- Python 3.10+
- A Google Gemini API Key (obtainable for free at [Google AI Studio](https://aistudio.google.com/app/apikey))

### 2. Setup Virtual Environment & Install Dependencies
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install -r requirements.txt
```

### 3. Configure API Key
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Edit `.env` and set your key:
```env
GEMINI_API_KEY="AIzaSyYourActualKeyHere..."
```

### 4. Run the Pipeline

**Search for vintage jackets:**
```bash
python main.py "vintage carhartt jacket" -m 10 -s 7
```

**Search a specific regional domain (e.g. UK or France):**
```bash
python main.py "salomon xt-6" -d vinted.co.uk -m 15 -s 8
python main.py "stussy hoodie" -d vinted.fr -m 10 -s 7
```

**Run in test / mock catalog mode (instantly evaluates without hitting Vinted network):**
```bash
python main.py "vintage levis 501" --mock -s 7
```

**Specify a custom output path:**
```bash
python main.py "barbour bedale" -m 12 -s 7 -o my_deals.json
```

---

## Structured Output Schema (`DealAnalysis`)

Every item evaluated returns a typed Pydantic object:

| Field | Type | Description |
|---|---|---|
| `estimated_market_value` | `float` | Estimated secondary market value in the item's currency |
| `deal_score` | `int (1-10)` | Overall deal score (9-10: Steal, 7-8: Good deal, 5-6: Fair, 1-4: Overpriced) |
| `condition_notes` | `str` | Detected defects, flaws, stains, or clean condition notes |
| `resale_profit_margin` | `float` | Estimated net resale profit margin after ~12% platform fees |
| `verdict` | `str` | `"MUST BUY"`, `"GOOD DEAL"`, `"FAIR PRICE"`, or `"OVERPRICED"` |
| `reasoning` | `str` | 1-2 sentence appraisal rationale backing up the valuation |

---

## Sample CLI Output

```
╭──────────────────────── Vinted Deal Hunter & Gemini AI Analyzer ────────────────────────╮
│ Query: vintage carhartt jacket | Max Items: 10 | Min Score: 7/10 | Domain: vinted.co.uk  │
│ AI Engine: Google Gemini 2.5 Flash (Structured Outputs)                                 │
╰─────────────────────────────────────────────────────────────────────────────────────────╯

💎 Top Vinted Deals Ranked by Gemini 2.5 Flash (Score >= 7)
┌───────┬───────────┬────────────────────────────┬───────────┬─────────────┬────────────┬──────────────────────────────────────┐
│ Score │ Verdict   │ Item & Brand               │ List Price│ Est. Market │ Est. Profit│ Condition & Notes                    │
├───────┼───────────┼────────────────────────────┼───────────┼─────────────┼────────────┼──────────────────────────────────────┤
│ 10/10 │ MUST BUY  │ Vintage Carhartt Detroit   │ £65.00    │ £240.00     │ +£146.20   │ Minor elbow fading, clean zipper.    │
│  9/10 │ MUST BUY  │ Arc'teryx Beta LT Gore-Tex │ £140.00   │ £310.00     │ +£132.80   │ Pristine seam tape, DWR reapplied.   │
│  8/10 │ GOOD DEAL │ Barbour Bedale Wax Jacket  │ £55.00    │ £145.00     │ +£72.60    │ Minor cuff fray, needs rewaxing.     │
│  8/10 │ GOOD DEAL │ Stussy 8 Ball Mohair Knit  │ £48.00    │ £130.00     │ +£66.40    │ Folded storage, no shoulder sag.     │
│  7/10 │ GOOD DEAL │ Vintage Levi's 501 W32 L32 │ £28.00    │ £75.00      │ +£38.00    │ Natural honeycombs, minor paint mark.│
└───────┴───────────┴────────────────────────────┴───────────┴─────────────┴────────────┴──────────────────────────────────────┘

✔ Full structured results saved to: /path/to/best_deals.json
```
