import { CodeFile } from '../types';

export const PYTHON_CODE_FILES: CodeFile[] = [
  {
    name: 'main.py',
    language: 'python',
    description: 'CLI entry point, orchestrator, Rich terminal dashboard, filtering & JSON export',
    content: `#!/usr/bin/env python3
"""
Vinted Deal Hunter & Gemini AI Analyzer
======================================
CLI Pipeline that scrapes Vinted listings, invokes Google Gemini 2.5 Flash
for appraisal and valuation, ranks top deals, outputs a styled terminal table,
and exports structured JSON results.
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import List

from dotenv import load_dotenv
load_dotenv()

from scraper import VintedScraper, VintedItem, get_mock_listings
from analyzer import GeminiDealAnalyzer, AnalyzedItem

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich import box
    RICH_AVAILABLE = True
    console = Console()
except ImportError:
    RICH_AVAILABLE = False
    console = None


def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


def display_results_table(deals: List[AnalyzedItem], min_score: int):
    if not deals:
        print(f"No deals found matching the threshold (deal_score >= {min_score}).")
        return

    if RICH_AVAILABLE:
        table = Table(
            title=f"💎 Top Vinted Deals Ranked by Gemini 2.5 Flash (Score >= {min_score})",
            box=box.ROUNDED,
            show_header=True,
            header_style="bold cyan",
            expand=True,
        )

        table.add_column("Score", justify="center", style="bold", width=7)
        table.add_column("Verdict", justify="center", width=12)
        table.add_column("Item & Brand", style="white", min_width=25)
        table.add_column("List Price", justify="right", style="magenta", width=11)
        table.add_column("Est. Market", justify="right", style="green", width=11)
        table.add_column("Est. Profit", justify="right", style="bold green", width=11)
        table.add_column("Condition & Notes", style="dim", min_width=25)
        table.add_column("Reasoning", style="italic", min_width=30)

        for deal in deals:
            item = deal.item
            analysis = deal.analysis
            score_color = "bright_green" if analysis.deal_score >= 9 else "green" if analysis.deal_score >= 7 else "yellow"

            verdict_badge = {
                "MUST BUY": "[bold white on dark_green] MUST BUY [/]",
                "GOOD DEAL": "[bold green on black] GOOD DEAL [/]",
                "FAIR PRICE": "[bold yellow on black] FAIR PRICE [/]",
                "OVERPRICED": "[bold red on black] OVERPRICED [/]",
            }.get(analysis.verdict, analysis.verdict)

            title_with_link = f"[link={item.url}]{item.title}[/link]\\n[cyan]{item.brand}[/] | Size: {item.size}"
            profit_str = f"+{analysis.resale_profit_margin:.2f} {item.currency}" if analysis.resale_profit_margin > 0 else f"{analysis.resale_profit_margin:.2f} {item.currency}"

            table.add_row(
                f"[{score_color}]{analysis.deal_score}/10[/]",
                verdict_badge,
                title_with_link,
                f"{item.price:.2f} {item.currency}",
                f"{analysis.estimated_market_value:.2f} {item.currency}",
                profit_str,
                f"[{item.condition}]\\n{analysis.condition_notes}",
                analysis.reasoning,
            )

        console.print(table)


def export_to_json(deals: List[AnalyzedItem], filepath: str):
    output_data = [{"item": d.item.model_dump(), "analysis": d.analysis.model_dump()} for d in deals]
    path = Path(filepath)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    print(f"\\n✔ Full structured results saved to: {path.resolve()}")


def parse_args():
    parser = argparse.ArgumentParser(description="Scrape Vinted and appraise items with Gemini 2.5 Flash")
    parser.add_argument("query", nargs="?", default="vintage carhartt jacket", help="Search keyword")
    parser.add_argument("-m", "--max-items", type=int, default=10, help="Max items to process")
    parser.add_argument("-s", "--min-score", type=int, default=7, help="Minimum deal score threshold (1-10)")
    parser.add_argument("-o", "--output", type=str, default="best_deals.json", help="Output JSON path")
    parser.add_argument("-d", "--domain", type=str, default="vinted.co.uk", help="Vinted country domain")
    parser.add_argument("--mock", action="store_true", help="Run with test listings catalog")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable debug logging")
    return parser.parse_args()


def main():
    args = parse_args()
    setup_logging(args.verbose)
    api_key = os.getenv("GEMINI_API_KEY")

    if args.mock:
        raw_items = get_mock_listings(query=args.query, count=args.max_items)
    else:
        scraper = VintedScraper(domain=args.domain)
        raw_items = scraper.search(query=args.query, max_items=args.max_items)
        if not raw_items:
            print("Notice: Vinted returned 0 items; falling back to sample catalog.")
            raw_items = get_mock_listings(query=args.query, count=args.max_items)

    analyzer = GeminiDealAnalyzer(api_key=api_key)
    analyzed_items = analyzer.analyze_batch(raw_items)

    best_deals = [d for d in analyzed_items if d.analysis.deal_score >= args.min_score]
    best_deals.sort(key=lambda d: (d.analysis.deal_score, d.analysis.resale_profit_margin), reverse=True)

    display_results_table(best_deals, min_score=args.min_score)
    export_to_json(best_deals, filepath=args.output)


if __name__ == "__main__":
    main()`,
  },
  {
    name: 'scraper.py',
    language: 'python',
    description: 'Vinted scraping module with session warmup, cookie capture, rate limiting & retry logic',
    content: `"""
Vinted Scraper Module
====================
Handles fetching and parsing product listings from Vinted with rate-limiting,
session cookie management, robust error handling, and graceful fallbacks.
"""

import json
import logging
import random
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("vinted_hunter.scraper")


class VintedItem(BaseModel):
    id: str = Field(..., description="Unique Vinted listing identifier")
    title: str = Field(..., description="Product title")
    price: float = Field(..., description="Listing price in given currency")
    currency: str = Field(default="EUR", description="Currency code (e.g. EUR, GBP, USD)")
    brand: str = Field(default="Unknown", description="Brand name")
    size: str = Field(default="Not specified", description="Clothing or shoe size")
    condition: str = Field(default="Good", description="Condition specified by seller")
    description: str = Field(default="", description="Full seller description text")
    url: str = Field(..., description="Direct link to listing")
    image_url: str = Field(default="", description="Main photo URL")
    raw_data: Optional[Dict[str, Any]] = Field(default=None, exclude=True)


class VintedScraper:
    DEFAULT_USER_AGENTS = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    ]

    def __init__(self, domain: str = "vinted.co.uk", min_delay: float = 1.5, max_delay: float = 3.0, max_retries: int = 3):
        self.domain = domain.lower().replace("https://", "").replace("http://", "").strip("/")
        self.base_url = f"https://www.{self.domain}"
        self.api_url = f"{self.base_url}/api/v2/catalog/items"
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.max_retries = max_retries
        self._session = None
        self._warmed_up = False

    def _get_session(self):
        if self._session is None:
            import requests
            self._session = requests.Session()
            self._session.headers.update({
                "User-Agent": random.choice(self.DEFAULT_USER_AGENTS),
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                "Connection": "keep-alive",
            })
        return self._session

    def _warmup_session(self) -> bool:
        if self._warmed_up:
            return True
        session = self._get_session()
        try:
            resp = session.get(self.base_url, timeout=10)
            if resp.status_code in [200, 301, 302]:
                self._warmed_up = True
                return True
        except Exception as e:
            logger.warning(f"Session warmup failed: {e}")
        return False

    def _polite_delay(self):
        time.sleep(random.uniform(self.min_delay, self.max_delay))

    def search(self, query: str, max_items: int = 20, page: int = 1, order: str = "newest_first") -> List[VintedItem]:
        self._warmup_session()
        session = self._get_session()

        params = {"search_text": query, "page": page, "per_page": min(max_items, 96), "order": order}
        items: List[VintedItem] = []

        for attempt in range(1, self.max_retries + 1):
            try:
                self._polite_delay()
                resp = session.get(self.api_url, params=params, timeout=12)
                if resp.status_code == 429:
                    time.sleep(5 * attempt)
                    continue
                if resp.status_code == 403:
                    break
                resp.raise_for_status()
                data = resp.json()

                for raw in data.get("items", []):
                    parsed = self._parse_raw_item(raw)
                    if parsed:
                        items.append(parsed)
                    if len(items) >= max_items:
                        break
                return items
            except Exception as e:
                logger.warning(f"Error during Vinted API request: {e}")
        return items

    def _parse_raw_item(self, raw: Dict[str, Any]) -> Optional[VintedItem]:
        try:
            item_id = str(raw.get("id") or "")
            if not item_id:
                return None
            title = str(raw.get("title") or raw.get("description") or "Untitled Item").strip()
            price_val = float((raw.get("price") or {}).get("amount", raw.get("price", 0.0)))
            currency = (raw.get("price") or {}).get("currency_code", "GBP" if "co.uk" in self.domain else "EUR")
            brand = raw.get("brand_title") or "Unknown Brand"
            size = raw.get("size_title") or "Not specified"
            condition = raw.get("status") or "Good"
            description = str(raw.get("description") or title).strip()
            url = raw.get("url") or f"{self.base_url}/items/{item_id}"
            photo = raw.get("photo") or {}
            image_url = photo.get("url") or photo.get("full_size_url") or ""

            return VintedItem(
                id=item_id, title=title, price=price_val, currency=currency,
                brand=brand, size=size, condition=condition, description=description,
                url=url if url.startswith("http") else f"{self.base_url}{url}",
                image_url=image_url,
            )
        except Exception:
            return None`,
  },
  {
    name: 'analyzer.py',
    language: 'python',
    description: 'Gemini 2.5 Flash appraisal engine using official google-genai SDK & Pydantic response_schema',
    content: `"""
Gemini AI Deal Analyzer Module
=============================
Appraises Vinted secondhand listings using Google Gemini 2.5 Flash with
structured output schemas (Pydantic), evaluating market value, deal scores,
condition notes, and resale margins.
"""

import json
import logging
import os
import time
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from scraper import VintedItem

logger = logging.getLogger("vinted_hunter.analyzer")


class DealAnalysis(BaseModel):
    estimated_market_value: float = Field(..., description="Estimated fair market value in the same currency.")
    deal_score: int = Field(..., ge=1, le=10, description="Deal rating from 1 (overpriced) to 10 (screaming bargain).")
    condition_notes: str = Field(..., description="Flags any hidden defects, wear-and-tear, stains, or red flags.")
    resale_profit_margin: float = Field(..., description="Estimated net profit margin (market value - price - 12% fees).")
    verdict: Literal["MUST BUY", "GOOD DEAL", "FAIR PRICE", "OVERPRICED"]
    reasoning: str = Field(..., description="1-2 sentence appraisal rationale backing up the valuation.")


class AnalyzedItem(BaseModel):
    item: VintedItem
    analysis: DealAnalysis


class GeminiDealAnalyzer:
    DEFAULT_MODEL = "gemini-2.5-flash"

    SYSTEM_INSTRUCTION = (
        "You are an expert vintage and secondhand fashion appraiser and deal hunter. "
        "Your task is to analyze Vinted secondhand clothing and footwear listings, accurately estimate "
        "their true secondary market resale value (e.g., on eBay, Grailed, Depop, or Vinted), "
        "and calculate whether the listed price represents an extraordinary bargain."
    )

    def __init__(self, api_key: Optional[str] = None, model: str = DEFAULT_MODEL):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model
        self.client = None

        if self.api_key:
            from google import genai
            self.client = genai.Client(api_key=self.api_key)

    def analyze_item(self, item: VintedItem) -> DealAnalysis:
        if not self.client:
            return self._mock_appraisal(item)

        from google.genai import types

        prompt = f"""
Appraise the following Vinted listing:
- Title: {item.title}
- Listed Price: {item.price:.2f} {item.currency}
- Brand: {item.brand}
- Size: {item.size}
- Condition stated by seller: {item.condition}
- Seller Description: \"\"\"{item.description}\"\"\"

Perform a professional appraisal:
1. Estimate true fair secondary market value in {item.currency}.
2. Rate deal score 1-10 (9-10: Steal, 7-8: Good deal, 5-6: Fair, 1-4: Overpriced).
3. Identify condition notes (mention any wear, stains, or clean condition).
4. Calculate net resale profit margin (Market - Price - 12% fees).
5. Choose verdict: MUST BUY, GOOD DEAL, FAIR PRICE, or OVERPRICED.
6. Provide a concise 1-2 sentence reasoning.
"""

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=self.SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=DealAnalysis,
                temperature=0.2,
            ),
        )

        if hasattr(response, "parsed") and response.parsed:
            return DealAnalysis(**response.parsed) if isinstance(response.parsed, dict) else response.parsed
        return DealAnalysis.model_validate_json(response.text.strip())

    def analyze_batch(self, items: List[VintedItem], delay_between_requests: float = 0.8) -> List[AnalyzedItem]:
        analyzed = []
        for i, item in enumerate(items):
            analysis = self.analyze_item(item)
            analyzed.append(AnalyzedItem(item=item, analysis=analysis))
            if i < len(items) - 1 and self.client:
                time.sleep(delay_between_requests)
        return analyzed`,
  },
  {
    name: 'requirements.txt',
    language: 'text',
    description: 'Python package dependencies specification',
    content: `# Core Google Gemini API SDK
google-genai>=1.0.0

# Vinted scraping & HTTP utilities
vinted-scraper>=2.0.0
requests>=2.31.0
curl-cffi>=0.7.0

# Data validation & environment
pydantic>=2.5.0
python-dotenv>=1.0.0

# Terminal UI & Formatting
rich>=13.7.0
tabulate>=0.9.0`,
  },
  {
    name: '.env.example',
    language: 'bash',
    description: 'Environment variables template',
    content: `# Google Gemini API Key (Required for Gemini 2.5 Flash appraisal)
# Get a free API key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="your_gemini_api_key_here"

# Optional Vinted regional domain (e.g. vinted.co.uk, vinted.fr, vinted.de, vinted.com)
VINTED_DOMAIN="vinted.co.uk"`,
  },
];
