"""
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
from urllib.parse import quote_plus
from pydantic import BaseModel, Field

# Configure logger
logger = logging.getLogger("vinted_hunter.scraper")


class VintedItem(BaseModel):
    """Normalized structured data representing a single Vinted product listing."""

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
    """
    Production-ready scraper for Vinted listings.
    Supports session warmup, realistic browser headers, rate-limiting,
    and automatic retry logic.
    """

    DEFAULT_USER_AGENTS = [
        (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ),
        (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        ),
        (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        ),
    ]

    def __init__(
        self,
        domain: str = "vinted.co.uk",
        min_delay: float = 1.5,
        max_delay: float = 3.0,
        max_retries: int = 3,
    ):
        """
        Initialize the Vinted scraper.

        :param domain: Vinted regional domain (e.g. 'vinted.co.uk', 'vinted.fr', 'vinted.de', 'vinted.com')
        :param min_delay: Minimum delay between requests in seconds
        :param max_delay: Maximum delay between requests in seconds
        :param max_retries: Number of retry attempts on transient network/rate-limit errors
        """
        self.domain = domain.lower().replace("https://", "").replace("http://", "").strip("/")
        self.base_url = f"https://www.{self.domain}"
        self.api_url = f"{self.base_url}/api/v2/catalog/items"
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.max_retries = max_retries
        self._session = None
        self._warmed_up = False

    def _get_session(self):
        """Lazy initialization of requests session with realistic headers."""
        if self._session is None:
            try:
                import requests
            except ImportError as e:
                raise ImportError(
                    "The 'requests' package is required. Install with: pip install requests"
                ) from e

            self._session = requests.Session()
            user_agent = random.choice(self.DEFAULT_USER_AGENTS)
            self._session.headers.update({
                "User-Agent": user_agent,
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"macOS"',
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Connection": "keep-alive",
            })
        return self._session

    def _warmup_session(self) -> bool:
        """
        Visit Vinted homepage or search page to establish session cookies
        and bypass initial anti-bot challenges.
        """
        if self._warmed_up:
            return True

        session = self._get_session()
        logger.info(f"Warming up session cookies for {self.base_url}...")
        try:
            resp = session.get(self.base_url, timeout=10)
            if resp.status_code in [200, 301, 302]:
                self._warmed_up = True
                logger.debug(f"Session warmed up successfully. Cookies: {list(session.cookies.keys())}")
                return True
            else:
                logger.warning(f"Warmup returned unexpected status code: {resp.status_code}")
                return False
        except Exception as e:
            logger.warning(f"Session warmup failed: {e}. Will proceed with direct API request.")
            return False

    def _polite_delay(self):
        """Sleep for a random interval to prevent rate-limiting."""
        delay = random.uniform(self.min_delay, self.max_delay)
        logger.debug(f"Rate limit guard: sleeping for {delay:.2f}s...")
        time.sleep(delay)

    def search(
        self,
        query: str,
        max_items: int = 20,
        page: int = 1,
        order: str = "newest_first",
    ) -> List[VintedItem]:
        """
        Search for items on Vinted matching the specified query.

        :param query: Keyword, brand, or search phrase
        :param max_items: Target number of items to retrieve
        :param page: Catalog page number
        :param order: Sort order ('newest_first', 'relevance', 'price_low_to_high')
        :return: List of validated VintedItem objects
        """
        # Try third-party vinted-scraper library if installed
        try:
            return self._search_via_vinted_scraper(query, max_items)
        except Exception as e:
            logger.debug(f"vinted-scraper library not available or failed ({e}); falling back to HTTP session API.")

        # Fallback to direct HTTP API
        return self._search_via_http_api(query, max_items, page, order)

    def _search_via_vinted_scraper(self, query: str, max_items: int) -> List[VintedItem]:
        """Attempt search using the official vinted-scraper package if available."""
        from vinted_scraper import VintedScraper as LibVintedScraper  # type: ignore

        scraper = LibVintedScraper(f"https://www.{self.domain}")
        raw_items = scraper.search(query, n_items=max_items)
        items: List[VintedItem] = []
        for raw in raw_items:
            item = self._parse_raw_item(raw if isinstance(raw, dict) else raw.__dict__)
            if item:
                items.append(item)
        return items

    def _search_via_http_api(
        self, query: str, max_items: int, page: int = 1, order: str = "newest_first"
    ) -> List[VintedItem]:
        """Query Vinted catalog API directly with session cookies and retries."""
        self._warmup_session()
        session = self._get_session()

        params = {
            "search_text": query,
            "page": page,
            "per_page": min(max_items, 96),
            "order": order,
        }

        items: List[VintedItem] = []
        for attempt in range(1, self.max_retries + 1):
            try:
                self._polite_delay()
                logger.info(f"Querying Vinted API (Attempt {attempt}/{self.max_retries}): '{query}'...")
                resp = session.get(self.api_url, params=params, timeout=12)

                if resp.status_code == 429:
                    wait_time = 5 * attempt
                    logger.warning(f"HTTP 429 Rate limit hit. Backing off for {wait_time}s...")
                    time.sleep(wait_time)
                    continue

                if resp.status_code == 403:
                    logger.warning("HTTP 403 Forbidden (Cloudflare bot challenge detected).")
                    break

                resp.raise_for_status()
                data = resp.json()

                raw_items = data.get("items", [])
                logger.info(f"Successfully received {len(raw_items)} raw listings from Vinted.")

                for raw in raw_items:
                    parsed = self._parse_raw_item(raw)
                    if parsed:
                        items.append(parsed)
                    if len(items) >= max_items:
                        break

                return items

            except Exception as e:
                logger.warning(f"Error during Vinted API request (attempt {attempt}): {e}")
                if attempt == self.max_retries:
                    logger.error("Max retries exceeded while querying Vinted.")

        return items

    def _parse_raw_item(self, raw: Dict[str, Any]) -> Optional[VintedItem]:
        """Safely extract and normalize listing fields from Vinted API payload."""
        try:
            item_id = str(raw.get("id") or "")
            if not item_id:
                return None

            title = str(raw.get("title") or raw.get("description") or "Untitled Item").strip()
            # Clean up overly long titles
            if len(title) > 120:
                title = title[:117] + "..."

            # Price extraction (handles multiple formats)
            price_val = 0.0
            currency_code = "EUR"
            raw_price = raw.get("price")
            if isinstance(raw_price, dict):
                price_val = float(raw_price.get("amount", 0.0))
                currency_code = raw_price.get("currency_code", "EUR")
            elif isinstance(raw_price, (int, float)):
                price_val = float(raw_price)
            elif isinstance(raw_price, str):
                # Strip symbols like £, €, $
                cleaned = "".join(ch for ch in raw_price if ch.isdigit() or ch in ".,")
                cleaned = cleaned.replace(",", ".")
                price_val = float(cleaned) if cleaned else 0.0

            # Currency fallback
            if not currency_code or currency_code == "EUR":
                if "co.uk" in self.domain:
                    currency_code = "GBP"
                elif ".com" in self.domain:
                    currency_code = "USD"

            # Brand extraction
            brand = (
                raw.get("brand_title")
                or (raw.get("brand") or {}).get("title")
                or "Unknown Brand"
            )

            # Size extraction
            size = (
                raw.get("size_title")
                or raw.get("size")
                or "Not specified"
            )

            # Condition extraction
            condition = (
                raw.get("status")
                or raw.get("condition")
                or "Good"
            )

            # Description
            description = str(raw.get("description") or title).strip()

            # URL
            url = raw.get("url") or f"{self.base_url}/items/{item_id}"
            if not url.startswith("http"):
                url = f"{self.base_url}{url}"

            # Main photo
            photo = raw.get("photo") or {}
            image_url = photo.get("url") or photo.get("full_size_url") or ""

            return VintedItem(
                id=item_id,
                title=title,
                price=price_val,
                currency=currency_code,
                brand=brand,
                size=size,
                condition=condition,
                description=description,
                url=url,
                image_url=image_url,
                raw_data=raw,
            )
        except Exception as e:
            logger.debug(f"Failed to parse item payload: {e}")
            return None


def get_mock_listings(query: str = "vintage carhartt jacket", count: int = 10) -> List[VintedItem]:
    """
    Generate realistic, high-fidelity mock Vinted listings for testing,
    offline verification, and bypassing Cloudflare captcha blocks.
    """
    catalog = [
        {
            "id": "409218201",
            "title": "Vintage Carhartt Detroit Jacket J97 MOS Olive Green Medium",
            "price": 65.0,
            "currency": "GBP",
            "brand": "Carhartt",
            "size": "M",
            "condition": "Very Good",
            "description": "Authentic 90s Carhartt Detroit jacket in rare moss green colorway. Blanket lined, corduroy collar. Minor fading on elbows, zipper works smoothly. No rips or holes. Great boxy fit.",
            "url": "https://www.vinted.co.uk/items/409218201-vintage-carhartt-detroit-jacket",
            "image_url": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=60",
        },
        {
            "id": "409218202",
            "title": "Barbour Bedale Wax Jacket Sage with Pin Badge C40 / Large",
            "price": 55.0,
            "currency": "GBP",
            "brand": "Barbour",
            "size": "L",
            "condition": "Good",
            "description": "Original Barbour Bedale jacket made in England. Classic tartan lining. Wax has a nice patina, could use a light rewaxing soon. Tiny fray on left cuff, all snap buttons intact.",
            "url": "https://www.vinted.co.uk/items/409218202-barbour-bedale-wax-jacket",
            "image_url": "https://images.unsplash.com/photo-1544441893-675973e31985?w=500&auto=format&fit=crop&q=60",
        },
        {
            "id": "409218203",
            "title": "Arc'teryx Beta LT Gore-Tex Jacket Black Mens Size L",
            "price": 140.0,
            "currency": "GBP",
            "brand": "Arc'teryx",
            "size": "L",
            "condition": "Very Good",
            "description": "Purchased last year from Arc'teryx flagship. Gore-Tex seam tape is pristine, DWR coating reapplied recently with Nikwax. Selling because I need an XL. 100% authentic with inner tags shown.",
            "url": "https://www.vinted.co.uk/items/409218203-arcteryx-beta-lt-gore-tex",
            "image_url": "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=500&auto=format&fit=crop&q=60",
        },
        {
            "id": "409218204",
            "title": "Vintage Levi's 501 Made in USA Selvedge Denim W32 L32",
            "price": 28.0,
            "currency": "GBP",
            "brand": "Levi's",
            "size": "W32 / L32",
            "condition": "Good",
            "description": "True vintage Levi's 501 jeans from 1994. Button fly, red tab. Lovely natural honeycomb fading and whiskering. Hem is chainstitched. Small paint smudge on coin pocket.",
            "url": "https://www.vinted.co.uk/items/409218204-vintage-levis-501-selvedge",
            "image_url": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&auto=format&fit=crop&q=60",
        },
        {
            "id": "409218205",
            "title": "Salomon XT-6 Gore-Tex Black / Phantom Trail Running Shoes UK 9",
            "price": 45.0,
            "currency": "GBP",
            "brand": "Salomon",
            "size": "UK 9 / EU 43",
            "condition": "Satisfactory",
            "description": "Worn on a few hiking trips. Tread is still sharp with plenty of life left. Some cosmetic scuff marks on the toe bumper and dirt on laces. Quicklace system works perfectly. No box.",
            "url": "https://www.vinted.co.uk/items/409218205-salomon-xt6-goretex-black",
            "image_url": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop&q=60",
        },
        {
            "id": "409218206",
            "title": "Fast Fashion Generic Zip Hoodie Dark Grey Unisex",
            "price": 22.0,
            "currency": "GBP",
            "brand": "Shein",
            "size": "M",
            "condition": "Good",
            "description": "Plain dark grey oversized zip hoodie. Polyester blend. Worn twice, no stains.",
            "url": "https://www.vinted.co.uk/items/409218206-generic-zip-hoodie",
            "image_url": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=60",
        },
        {
            "id": "409218207",
            "title": "Stussy 8 Ball Mohair Knit Sweater Natural Off-White Size M",
            "price": 48.0,
            "currency": "GBP",
            "brand": "Stussy",
            "size": "M",
            "condition": "Very Good",
            "description": "Iconic Stussy 8-ball heavyweight knit jumper. Super soft mohair blend. Worn only for a photoshoot. Clean collar, stored folded on shelf so shoulders are not stretched.",
            "url": "https://www.vinted.co.uk/items/409218207-stussy-8-ball-knit-sweater",
            "image_url": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&auto=format&fit=crop&q=60",
        },
        {
            "id": "409218208",
            "title": "Nike Dunk Low Retro 'Panda' Black White UK 8.5",
            "price": 85.0,
            "currency": "GBP",
            "brand": "Nike",
            "size": "UK 8.5",
            "condition": "Good",
            "description": "Nike Panda dunks. Creasing on toe box and star loss on outsole. Replacement generic laces. Rep box.",
            "url": "https://www.vinted.co.uk/items/409218208-nike-dunk-low-panda",
            "image_url": "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&auto=format&fit=crop&q=60",
        },
        {
            "id": "409218209",
            "title": "Patagonia Classic Retro-X Deep Pile Fleece Jacket Natural Cream Mens L",
            "price": 50.0,
            "currency": "GBP",
            "brand": "Patagonia",
            "size": "L",
            "condition": "Very Good",
            "description": "Patagonia Retro-X windproof fleece jacket. Navy blue chest pocket. Fleece pile is still fluffy, not matted at elbows. YKK zips in perfect order.",
            "url": "https://www.vinted.co.uk/items/409218209-patagonia-retro-x-fleece",
            "image_url": "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=500&auto=format&fit=crop&q=60",
        },
        {
            "id": "409218210",
            "title": "Ralph Lauren Cable Knit Cashmere Blend Crewneck Jumper Navy Small",
            "price": 20.0,
            "currency": "GBP",
            "brand": "Ralph Lauren",
            "size": "S",
            "condition": "Very Good",
            "description": "Original Polo Ralph Lauren cable-knit sweater with red embroidered pony. Wool cashmere blend. Hand washed only, no shrinkage or bobbling.",
            "url": "https://www.vinted.co.uk/items/409218210-ralph-lauren-cable-knit",
            "image_url": "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?w=500&auto=format&fit=crop&q=60",
        },
    ]

    selected = catalog[:count]
    return [VintedItem(**item) for item in selected]
