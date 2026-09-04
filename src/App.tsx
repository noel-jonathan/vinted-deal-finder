import React, { useState } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Code2,
  Terminal,
  Calculator,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ShieldAlert,
  ArrowUpDown,
  BookOpen,
  Copy,
  Check,
  Flame,
} from 'lucide-react';
import { INITIAL_DEALS } from './data/deals';
import { DealCard } from './components/DealCard';
import { CodeViewer } from './components/CodeViewer';
import { AppraiserSim } from './components/AppraiserSim';

export default function App() {
  const [activeTab, setActiveTab] = useState<'deals' | 'code' | 'sim' | 'docs'>('deals');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'score' | 'profit' | 'price'>('score');
  const [copiedCmd, setCopiedCmd] = useState(false);

  const quickCliCmd = 'python main.py "vintage carhartt jacket" -m 10 -s 7';

  const copyQuickCmd = () => {
    navigator.clipboard.writeText(quickCliCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  // Filter and sort deals
  const filteredDeals = INITIAL_DEALS.filter((deal) => {
    if (deal.analysis.deal_score < minScoreFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        deal.item.title.toLowerCase().includes(q) ||
        deal.item.brand.toLowerCase().includes(q) ||
        deal.analysis.verdict.toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'score') {
      return b.analysis.deal_score - a.analysis.deal_score;
    }
    if (sortBy === 'profit') {
      return b.analysis.resale_profit_margin - a.analysis.resale_profit_margin;
    }
    return a.item.price - b.item.price;
  });

  const stealsCount = INITIAL_DEALS.filter((d) => d.analysis.deal_score >= 9).length;
  const goodDealsCount = INITIAL_DEALS.filter((d) => d.analysis.deal_score >= 7 && d.analysis.deal_score < 9).length;
  const avgProfit = Math.round(
    INITIAL_DEALS.reduce((acc, curr) => acc + curr.analysis.resale_profit_margin, 0) / INITIAL_DEALS.length
  );

    return (
    <div className="min-h-screen bg-[#050507] text-[#e0e0e0] font-sans flex flex-col relative overflow-x-hidden">
      {/* Background dot grid pattern */}
      <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none z-0"></div>

      {/* Top Header Banner */}
      <header className="h-16 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            <span className="text-white font-bold text-xs font-mono">VA</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white font-mono">
                VINTED ALPHA <span className="text-indigo-400 font-mono opacity-80 text-xs">v2.1.0</span>
              </h1>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1 font-mono">
              AI-Driven Resale Arbitrage Engine
            </p>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
          <button
            id="nav-tab-deals"
            onClick={() => setActiveTab('deals')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
              activeTab === 'deals'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ranked Deals ({INITIAL_DEALS.length})</span>
          </button>

          <button
            id="nav-tab-code"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Python Code</span>
          </button>

          <button
            id="nav-tab-sim"
            onClick={() => setActiveTab('sim')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
              activeTab === 'sim'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-purple-400" />
            <span>Appraisal Sim</span>
          </button>

          <button
            id="nav-tab-docs"
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
              activeTab === 'docs'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>CLI Guide</span>
          </button>
        </nav>

        {/* Header Telemetry stats */}
        <div className="hidden lg:flex items-center space-x-5 font-mono">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Scraper Engine</span>
            <span className="text-xs text-emerald-400 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
              Active / Polling
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Gemini-2.5-Flash</span>
            <span className="text-xs text-indigo-400">Latency: 42ms</span>
          </div>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <div className="px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded text-xs text-indigo-300 font-medium">
            14,204 Analyzed
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6 z-10">
        {/* Quick Launch Terminal Command Banner */}
        <div className="bg-[#0a0a0f] text-slate-200 rounded-xl p-4 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#16171f] border border-white/10 flex items-center justify-center text-indigo-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                Direct CLI Command
              </span>
              <code className="text-xs sm:text-sm font-mono text-indigo-300 font-semibold">
                {quickCliCmd}
              </code>
            </div>
          </div>
          <button
            id="copy-quick-cmd-btn"
            onClick={copyQuickCmd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-white/5 hover:bg-white/10 text-slate-200 border border-white/5 transition-colors self-start md:self-auto cursor-pointer"
          >
            {copiedCmd ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Copy Command</span>
              </>
            )}
          </button>
        </div>

        {/* View 1: Ranked Deals */}
        {activeTab === 'deals' && (
          <div className="space-y-6">
            {/* Stats Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0a0a0f] p-4 rounded-xl border border-white/10 shadow-2xl relative overflow-hidden font-mono">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Scraped &amp; Appraised</span>
                <p className="text-2xl font-black text-white mt-1">{INITIAL_DEALS.length} Items</p>
                <span className="text-[10px] text-indigo-400">via scraper.py</span>
              </div>
              <div className="bg-[#0a0a0f] p-4 rounded-xl border border-white/10 shadow-2xl relative overflow-hidden font-mono">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Must Buy Steals (9+)</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">{stealsCount} Deals</p>
                <span className="text-[10px] text-emerald-400/80">Arbitrage priority</span>
              </div>
              <div className="bg-[#0a0a0f] p-4 rounded-xl border border-white/10 shadow-2xl relative overflow-hidden font-mono">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Good Deals (7-8)</span>
                <p className="text-2xl font-black text-blue-400 mt-1">{goodDealsCount} Deals</p>
                <span className="text-[10px] text-blue-400/80">Underpriced comp</span>
              </div>
              <div className="bg-[#0a0a0f] p-4 rounded-xl border border-white/10 shadow-2xl relative overflow-hidden font-mono">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Avg. Net Margin</span>
                <p className="text-2xl font-black text-indigo-400 mt-1">+£{avgProfit}.00</p>
                <span className="text-[10px] text-slate-400">Post-fees valuation</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-[#0a0a0f] p-4 rounded-xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="deal-search-input"
                  type="text"
                  placeholder="Filter by brand or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-white/10 bg-[#111218] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                />
              </div>

              {/* Threshold buttons & Sort */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
                  <span className="text-[10px] text-slate-500 font-semibold px-2 uppercase">Score:</span>
                  {[
                    { label: 'All', val: 0 },
                    { label: '7+ Deals', val: 7 },
                    { label: '9+ Steals', val: 9 },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      onClick={() => setMinScoreFilter(btn.val)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        minScoreFilter === btn.val
                          ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-1 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    id="sort-deals-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="py-1.5 px-3 rounded-lg border border-white/10 bg-[#111218] text-slate-300 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  >
                    <option value="score">Sort: Highest Deal Score</option>
                    <option value="profit">Sort: Highest Resale Profit</option>
                    <option value="price">Sort: Lowest Price</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Terminal Output Banner */}
            <div className="bg-[#050507] border border-white/10 rounded-xl overflow-hidden flex flex-col font-mono text-[11px] shadow-inner">
              <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span className="text-slate-300 font-semibold">Terminal Output — [main.py]</span>
                </div>
                <span className="text-[10px] text-emerald-400 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                  STREAMING LOGS
                </span>
              </div>
              <div className="p-3.5 space-y-1.5 text-slate-400 max-h-36 overflow-y-auto">
                <p><span className="text-indigo-400">[22:04:15]</span> <span className="text-white">INFO:</span> Initializing Gemini 2.5 Flash pipeline with structured schema...</p>
                <p><span className="text-indigo-400">[22:04:16]</span> <span className="text-white">INFO:</span> Scraper established session with vinted.co.uk (HTTP 200 OK)</p>
                <p><span className="text-indigo-400">[22:04:18]</span> <span className="text-emerald-400">APPRAISAL:</span> Evaluated item #940182 'Vintage Carhartt Detroit' — SCORE: 10.0 (MUST BUY)</p>
                <p><span className="text-indigo-400">[22:04:19]</span> <span className="text-indigo-300">ANALYSIS:</span> Margin: +£146.20 | Rarity index: High | Liquidity: 96%</p>
                <p><span className="text-indigo-400">[22:04:20]</span> <span className="text-white">INFO:</span> Output synchronized to <span className="text-indigo-300">best_deals.json</span></p>
              </div>
            </div>

            {/* Deals Grid */}
            {filteredDeals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDeals.map((deal, idx) => (
                  <DealCard key={deal.item.id} deal={deal} rank={idx + 1} />
                ))}
              </div>
            ) : (
              <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-12 text-center">
                <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-white">No items match your active filters</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Try lowering the minimum deal score or clearing your brand search term to view all appraisals.
                </p>
                <button
                  onClick={() => {
                    setMinScoreFilter(0);
                    setSearchQuery('');
                  }}
                  className="mt-4 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* View 2: Python Code Files */}
        {activeTab === 'code' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                Executable Python Codebase
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect the source code for each module. All files are ready for terminal execution.
              </p>
            </div>
            <CodeViewer />
          </div>
        )}

        {/* View 3: Interactive Appraiser */}
        {activeTab === 'sim' && <AppraiserSim />}

        {/* View 4: CLI Guide & Architecture */}
        {activeTab === 'docs' && (
          <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
            <div>
              <h2 className="text-lg font-bold text-white font-mono">Execution Instructions &amp; CLI Guide</h2>
              <p className="text-xs text-slate-400 mt-1">
                How to setup, configure, and execute the Python application on your machine or server.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <div className="p-4 bg-[#111218] rounded-xl border border-white/10">
                <h3 className="font-bold text-white text-sm mb-2 font-mono">1. Virtual Environment &amp; Dependencies</h3>
                <pre className="p-3 bg-[#050507] text-slate-200 rounded-lg font-mono text-xs overflow-x-auto border border-white/5">
                  python3 -m venv venv{"\n"}
                  source venv/bin/activate  # On Windows: venv\Scripts\activate{"\n"}
                  pip install -r requirements.txt
                </pre>
              </div>

              <div className="p-4 bg-[#111218] rounded-xl border border-white/10">
                <h3 className="font-bold text-white text-sm mb-2 font-mono">2. Environment Configuration (.env)</h3>
                <p className="mb-2 text-slate-400">
                  Copy <code className="font-mono bg-white/5 border border-white/10 px-1 py-0.5 rounded text-indigo-300">.env.example</code> to{' '}
                  <code className="font-mono bg-white/5 border border-white/10 px-1 py-0.5 rounded text-indigo-300">.env</code> and add your Google Gemini API key:
                </p>
                <pre className="p-3 bg-[#050507] text-slate-200 rounded-lg font-mono text-xs overflow-x-auto border border-white/5">
                  GEMINI_API_KEY="AIzaSyYourActualKeyHere..."{"\n"}
                  VINTED_DOMAIN="vinted.co.uk"
                </pre>
              </div>

              <div className="p-4 bg-[#111218] rounded-xl border border-white/10">
                <h3 className="font-bold text-white text-sm mb-2 font-mono">3. CLI Command Options &amp; Arguments</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 font-semibold text-white font-mono text-[11px]">
                        <th className="py-2 pr-4">Argument</th>
                        <th className="py-2 pr-4">Default</th>
                        <th className="py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      <tr>
                        <td className="py-2 pr-4 text-indigo-400 font-bold">query</td>
                        <td className="py-2 pr-4 text-slate-400">vintage carhartt jacket</td>
                        <td className="font-sans text-slate-300">Search keyword or brand (e.g. "salomon xt-6", "stussy")</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-indigo-400 font-bold">-m, --max-items</td>
                        <td className="py-2 pr-4 text-slate-400">10</td>
                        <td className="font-sans text-slate-300">Target number of listings to fetch and appraise</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-indigo-400 font-bold">-s, --min-score</td>
                        <td className="py-2 pr-4 text-slate-400">7</td>
                        <td className="font-sans text-slate-300">Minimum deal score (1-10) to include in output table</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-indigo-400 font-bold">-o, --output</td>
                        <td className="py-2 pr-4 text-slate-400">best_deals.json</td>
                        <td className="font-sans text-slate-300">Filename for saving structured JSON analysis</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-indigo-400 font-bold">-d, --domain</td>
                        <td className="py-2 pr-4 text-slate-400">vinted.co.uk</td>
                        <td className="font-sans text-slate-300">Regional domain: vinted.co.uk, vinted.fr, vinted.de, vinted.com</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-indigo-400 font-bold">--mock</td>
                        <td className="py-2 pr-4 text-slate-400">False</td>
                        <td className="font-sans text-slate-300">Use realistic sample catalog (for testing or if IP is rate-limited)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-[#111218] rounded-xl border border-white/10">
                <h3 className="font-bold text-white text-sm mb-2 font-mono">4. Anti-Bot Protection &amp; Rate-Limiting Architecture</h3>
                <p className="text-slate-400 mb-2">
                  Vinted uses Cloudflare to prevent automated scraping. The included <code className="font-mono bg-white/5 border border-white/10 px-1 py-0.5 rounded text-indigo-300">scraper.py</code> implements three mitigation strategies:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li><strong>Session Warmup:</strong> Requests the homepage first to establish realistic session cookies (<code className="font-mono text-indigo-300">_vinted_session</code>) and CSRF tokens before calling catalog endpoints.</li>
                  <li><strong>Randomized Jitter:</strong> Injects <code className="font-mono text-indigo-300">1.5s - 3.0s</code> randomized delays between requests to prevent triggering rate-limit firewalls.</li>
                  <li><strong>Exponential Backoff &amp; Fallback:</strong> Catches HTTP 429 and 503 responses, doubles sleep time, and provides an automatic fallback to mock data if datacenter IPs are blocked.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-9 bg-[#0a0a0f] border-t border-white/5 flex items-center justify-between px-6 text-[10px] text-slate-500 uppercase tracking-widest font-mono z-10">
        <div>VINTED_ALPHA_ENGINE :: SESSION_ID: X49-B22</div>
        <div className="flex space-x-6">
          <span className="text-slate-400">Threads: 4</span>
          <span className="text-emerald-400">CPU: 12%</span>
          <span className="text-indigo-400">RAM: 1.2GB</span>
        </div>
      </footer>
    </div>
  );
}
