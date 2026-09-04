#!/usr/bin/env python3
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

# Load environment variables from .env file (if python-dotenv is installed)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from scraper import VintedScraper, VintedItem, get_mock_listings
from analyzer import GeminiDealAnalyzer, AnalyzedItem

# Try importing Rich for terminal presentation
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
    """Configure structured console logging."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


def display_results_table(deals: List[AnalyzedItem], min_score: int):
    """Render a terminal table showing ranked deals."""
    if not deals:
        if RICH_AVAILABLE:
            console.print(f"[yellow]No deals found matching the threshold (deal_score >= {min_score}).[/yellow]")
        else:
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

            # Color verdict badges
            score_color = "bright_green" if analysis.deal_score >= 9 else "green"
            if analysis.deal_score < 7:
                score_color = "yellow"

            verdict_badge = {
                "MUST BUY": "[bold white on dark_green] MUST BUY [/]",
                "GOOD DEAL": "[bold green on black] GOOD DEAL [/]",
                "FAIR PRICE": "[bold yellow on black] FAIR PRICE [/]",
                "OVERPRICED": "[bold red on black] OVERPRICED [/]",
            }.get(analysis.verdict, analysis.verdict)

            title_with_link = f"[link={item.url}]{item.title}[/link]\n[cyan]{item.brand}[/] | Size: {item.size}"
            price_str = f"{item.price:.2f} {item.currency}"
            market_str = f"{analysis.estimated_market_value:.2f} {item.currency}"
            profit_str = f"+{analysis.resale_profit_margin:.2f} {item.currency}" if analysis.resale_profit_margin > 0 else f"{analysis.resale_profit_margin:.2f} {item.currency}"

            table.add_row(
                f"[{score_color}]{analysis.deal_score}/10[/]",
                verdict_badge,
                title_with_link,
                price_str,
                market_str,
                profit_str,
                f"[{item.condition}]\n{analysis.condition_notes}",
                analysis.reasoning,
            )

        console.print(table)
    else:
        # Fallback to plain text table if Rich is not installed
        print("\n" + "=" * 95)
        print(f"TOP VINTED DEALS (Score >= {min_score})")
        print("=" * 95)
        for i, deal in enumerate(deals, 1):
            item = deal.item
            a = deal.analysis
            print(f"\n#{i} | Score: {a.deal_score}/10 | [{a.verdict}] {item.title}")
            print(f"    Brand: {item.brand} | Size: {item.size} | Condition: {item.condition}")
            print(f"    Listed: {item.price:.2f} {item.currency} | Market: {a.estimated_market_value:.2f} {item.currency} | Profit: {a.resale_profit_margin:.2f} {item.currency}")
            print(f"    Notes: {a.condition_notes}")
            print(f"    Appraisal: {a.reasoning}")
            print(f"    Link: {item.url}")
        print("=" * 95)


def export_to_json(deals: List[AnalyzedItem], filepath: str):
    """Save full structured output to a JSON file."""
    output_data = []
    for d in deals:
        output_data.append({
            "item": d.item.model_dump(),
            "analysis": d.analysis.model_dump(),
        })

    path = Path(filepath)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    if RICH_AVAILABLE:
        console.print(f"\n[green]✔ Full structured results saved to:[/green] [bold cyan]{path.resolve()}[/bold cyan]")
    else:
        print(f"\n✔ Full structured results saved to: {path.resolve()}")


def parse_args():
    """Parse command line options."""
    parser = argparse.ArgumentParser(
        description="Scrape Vinted listings and appraise them with Google Gemini 2.5 Flash to find underpriced steals.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "query",
        nargs="?",
        default="vintage carhartt jacket",
        help="Search query or keyword (e.g. 'carhartt jacket', 'salomon xt-6', 'vintage levis 501')",
    )
    parser.add_argument(
        "-m", "--max-items",
        type=int,
        default=10,
        help="Maximum listings to scrape and appraise",
    )
    parser.add_argument(
        "-s", "--min-score",
        type=int,
        default=7,
        help="Minimum deal_score (1-10) required to include in best deals",
    )
    parser.add_argument(
        "-o", "--output",
        type=str,
        default="best_deals.json",
        help="Output JSON filename",
    )
    parser.add_argument(
        "-d", "--domain",
        type=str,
        default="vinted.co.uk",
        help="Vinted country domain (e.g. vinted.co.uk, vinted.fr, vinted.de, vinted.com)",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use realistic built-in mock listings (useful for testing or when Vinted blocks IP with Cloudflare)",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable detailed debug logs",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    setup_logging(args.verbose)

    # Check for GEMINI_API_KEY
    api_key = os.getenv("GEMINI_API_KEY")

    if RICH_AVAILABLE:
        console.print(
            Panel.fit(
                f"[bold cyan]Vinted Deal Hunter & Gemini AI Analyzer[/bold cyan]\n"
                f"[white]Query:[/] [yellow]{args.query}[/] | [white]Max Items:[/] [magenta]{args.max_items}[/] | "
                f"[white]Min Score:[/] [green]{args.min_score}/10[/] | [white]Domain:[/] [cyan]{args.domain}[/]\n"
                f"[white]AI Engine:[/] [blue]Google Gemini 2.5 Flash (Structured Outputs)[/]",
                border_style="cyan",
            )
        )
    else:
        print(f"--- Vinted Deal Hunter (Query: '{args.query}', Target: {args.max_items} items) ---")

    if not api_key:
        msg = (
            "⚠ GEMINI_API_KEY not detected in environment or .env file.\n"
            "The analyzer will operate in heuristic offline mode.\n"
            "To use real Gemini 2.5 Flash, set GEMINI_API_KEY in your .env file."
        )
        if RICH_AVAILABLE:
            console.print(f"[yellow]{msg}[/yellow]\n")
        else:
            print(msg + "\n")

    # Step 1: Scrape or retrieve listings
    if args.mock:
        if RICH_AVAILABLE:
            console.print("[dim]Using realistic test catalog (--mock active)...[/dim]")
        raw_items = get_mock_listings(query=args.query, count=args.max_items)
    else:
        scraper = VintedScraper(domain=args.domain)
        if RICH_AVAILABLE:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
            ) as progress:
                task = progress.add_task(f"Searching Vinted ({args.domain}) for '{args.query}'...", total=None)
                raw_items = scraper.search(query=args.query, max_items=args.max_items)
                progress.remove_task(task)
        else:
            print(f"Searching Vinted for '{args.query}'...")
            raw_items = scraper.search(query=args.query, max_items=args.max_items)

        # Graceful fallback if Vinted returned 0 items due to Cloudflare captcha challenge
        if not raw_items:
            fallback_msg = (
                "Notice: Vinted returned 0 live items (likely due to Cloudflare bot protection on this IP).\n"
                "Switching automatically to realistic sample catalog so you can see the Gemini Analyzer in action."
            )
            if RICH_AVAILABLE:
                console.print(f"[yellow]{fallback_msg}[/yellow]")
            else:
                print(fallback_msg)
            raw_items = get_mock_listings(query=args.query, count=args.max_items)

    if not raw_items:
        if RICH_AVAILABLE:
            console.print("[red]No listings could be scraped or retrieved. Exiting.[/red]")
        else:
            print("No listings found. Exiting.")
        sys.exit(1)

    if RICH_AVAILABLE:
        console.print(f"[green]✔ Retrieved {len(raw_items)} listings. Sending to Gemini 2.5 Flash for appraisal...[/green]\n")
    else:
        print(f"Retrieved {len(raw_items)} listings. Sending to Gemini 2.5 Flash...")

    # Step 2: Analyze with Gemini AI
    analyzer = GeminiDealAnalyzer(api_key=api_key)
    analyzed_items = analyzer.analyze_batch(raw_items)

    # Step 3: Filter deals with deal_score >= min_score and sort descending
    best_deals = [d for d in analyzed_items if d.analysis.deal_score >= args.min_score]
    best_deals.sort(
        key=lambda d: (d.analysis.deal_score, d.analysis.resale_profit_margin),
        reverse=True,
    )

    # Step 4: Display terminal table
    display_results_table(best_deals, min_score=args.min_score)

    # Step 5: Save structured results
    export_to_json(best_deals, filepath=args.output)


if __name__ == "__main__":
    main()
