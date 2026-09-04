import React, { useState } from 'react';
import { Sparkles, Calculator, AlertCircle, RefreshCw } from 'lucide-react';
import { DealAnalysis } from '../types';

export const AppraiserSim: React.FC = () => {
  const [title, setTitle] = useState('Vintage Carhartt Detroit Jacket J97 MOS Olive Green Medium');
  const [brand, setBrand] = useState('Carhartt');
  const [price, setPrice] = useState('65.00');
  const [currency, setCurrency] = useState('GBP');
  const [size, setSize] = useState('M');
  const [condition, setCondition] = useState('Very Good');
  const [description, setDescription] = useState(
    'Authentic 90s Carhartt Detroit jacket in rare moss green colorway. Blanket lined, corduroy collar. Minor fading on elbows, zipper works smoothly. No rips or holes. Great boxy fit.'
  );

  const [result, setResult] = useState<DealAnalysis | null>({
    estimated_market_value: 240.0,
    deal_score: 10,
    condition_notes: 'Slight authentic fading on elbows consistent with age; zipper operational and no structural rips or holes.',
    resale_profit_margin: 146.2,
    verdict: 'MUST BUY',
    reasoning: 'The 1990s J97 MOS Detroit jacket is one of the most coveted workwear collector pieces, regularly commanding £220-£260 on secondary markets. Listed at £65, this is an exceptional steal with high resale liquidity.',
  });

  const [loading, setLoading] = useState(false);

  const runSimulation = () => {
    setLoading(true);
    setTimeout(() => {
      const priceNum = parseFloat(price) || 20.0;
      const brandLower = brand.toLowerCase();
      const descLower = description.toLowerCase();

      // Brand equity multiplier
      let multiplier = 1.1;
      if (brandLower.includes('carhartt')) multiplier = 2.2;
      else if (brandLower.includes('barbour')) multiplier = 2.1;
      else if (brandLower.includes("arc'teryx") || brandLower.includes('arcteryx')) multiplier = 2.0;
      else if (brandLower.includes('stussy')) multiplier = 1.9;
      else if (brandLower.includes("levi's") || brandLower.includes('levis')) multiplier = 1.7;
      else if (brandLower.includes('salomon')) multiplier = 1.6;
      else if (brandLower.includes('patagonia')) multiplier = 1.7;
      else if (brandLower.includes('shein') || brandLower.includes('primark')) multiplier = 0.5;

      const estimatedMarket = Math.round(priceNum * multiplier * 10) / 10;
      const profit = Math.round((estimatedMarket - priceNum - estimatedMarket * 0.12) * 10) / 10;

      let score = 6;
      let verdict: DealAnalysis['verdict'] = 'FAIR PRICE';

      const ratio = estimatedMarket / Math.max(priceNum, 1);
      if (ratio >= 2.0 && profit >= 25) {
        score = 9 + (profit >= 80 ? 1 : 0);
        verdict = 'MUST BUY';
      } else if (ratio >= 1.4 && profit >= 10) {
        score = 7 + (profit >= 30 ? 1 : 0);
        verdict = 'GOOD DEAL';
      } else if (ratio >= 1.0) {
        score = 5 + (profit >= 0 ? 1 : 0);
        verdict = 'FAIR PRICE';
      } else {
        score = Math.max(2, Math.round(ratio * 4));
        verdict = 'OVERPRICED';
      }

      // Check condition flags
      let notes = 'Normal pre-owned condition without obvious structural flaws.';
      if (descLower.includes('rip') || descLower.includes('hole') || descLower.includes('stain') || descLower.includes('tear')) {
        notes = 'Seller description explicitly flags flaws or marks; inspect photos carefully.';
        score = Math.max(1, score - 2);
      } else if (descLower.includes('new with tags') || descLower.includes('deadstock')) {
        notes = 'Deadstock / pristine condition noted; adds secondary valuation premium.';
        score = Math.min(10, score + 1);
      }

      let reason = `Estimated fair secondary comp is ~${estimatedMarket.toFixed(2)} ${currency} based on ${brand} market velocity and current condition.`;
      if (verdict === 'MUST BUY') {
        reason = `Substantially underpriced for authentic ${brand}. High resale demand on Grailed/eBay allows immediate net flip or great personal savings.`;
      } else if (verdict === 'OVERPRICED') {
        reason = `Listing price of ${priceNum.toFixed(2)} ${currency} matches or exceeds realistic resale value; low buyer demand.`;
      }

      setResult({
        estimated_market_value: estimatedMarket,
        deal_score: score,
        condition_notes: notes,
        resale_profit_margin: profit,
        verdict,
        reasoning: reason,
      });
      setLoading(false);
    }, 450);
  };

  const loadPreset = (
    presetTitle: string,
    presetBrand: string,
    presetPrice: string,
    presetDesc: string
  ) => {
    setTitle(presetTitle);
    setBrand(presetBrand);
    setPrice(presetPrice);
    setDescription(presetDesc);
  };

    return (
    <div id="appraiser-simulator-panel" className="bg-[#0a0a0f] border border-white/10 rounded-xl p-6 shadow-2xl relative overflow-hidden">
      {/* Top ambient glow line */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/5 mb-6 gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Interactive Deal Appraiser Simulation</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Simulate how Gemini 2.5 Flash calculates secondary comps, flags hidden defects, and rates deal scores.
          </p>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Presets:</span>
          <button
            onClick={() =>
              loadPreset(
                'Barbour Bedale Waxed Jacket Olive C38',
                'Barbour',
                '50.00',
                'Made in England vintage Barbour. Heavy patina, light rewaxing needed on sleeves. Snaps functional.'
              )
            }
            className="text-[11px] font-mono px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-indigo-300 border border-white/5 transition-colors cursor-pointer"
          >
            Barbour £50
          </button>
          <button
            onClick={() =>
              loadPreset(
                "Arc'teryx Atom LT Hoody Black Mens Medium",
                "Arc'teryx",
                '95.00',
                'Clean condition, Coreloft insulation still lofty, no tears or burn marks. YKK zipper smooth.'
              )
            }
            className="text-[11px] font-mono px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-indigo-300 border border-white/5 transition-colors cursor-pointer"
          >
            Arc'teryx £95
          </button>
          <button
            onClick={() =>
              loadPreset(
                'Fast Fashion Puffer Jacket Black L',
                'Shein',
                '35.00',
                'Basic polyester puffer jacket. Worn once.'
              )
            }
            className="text-[11px] font-mono px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5 transition-colors cursor-pointer"
          >
            Shein £35
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Listing Title
            </label>
            <input
              id="sim-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-[#111218] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 font-medium"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Brand
              </label>
              <input
                id="sim-brand-input"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-[#111218] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Listed Price
              </label>
              <input
                id="sim-price-input"
                type="number"
                step="0.5"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-[#111218] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 font-medium font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Currency
              </label>
              <select
                id="sim-currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-[#111218] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 font-medium font-mono"
              >
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Seller Description (Scrutinized for flaws)
            </label>
            <textarea
              id="sim-desc-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-[#111218] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 font-medium leading-relaxed"
            />
          </div>

          <button
            id="run-appraisal-sim-btn"
            onClick={runSimulation}
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-mono font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating Gemini 2.5 Flash Appraisal...</span>
              </>
            ) : (
              <>
                <Calculator className="w-3.5 h-3.5" />
                <span>Execute Appraisal Simulation</span>
              </>
            )}
          </button>
        </div>

        {/* Appraisal Output Card */}
        {result && (
          <div className="bg-[#111218] border border-white/10 rounded-xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                      Deal Rating
                    </span>
                    <span
                      className={`text-2xl font-black font-mono leading-none mt-0.5 ${
                        result.deal_score >= 9
                          ? 'text-emerald-400'
                          : result.deal_score >= 7
                          ? 'text-blue-400'
                          : result.deal_score >= 5
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {result.deal_score}
                      <span className="text-xs text-slate-500 font-normal">/10</span>
                    </span>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded text-xs font-bold font-mono tracking-wider border uppercase ${
                    result.verdict === 'MUST BUY'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : result.verdict === 'GOOD DEAL'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : result.verdict === 'FAIR PRICE'
                      ? 'bg-white/5 text-slate-400 border-white/10'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {result.verdict}
                </span>
              </div>

              {/* Valuation metrics */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="bg-[#16171f] p-3 rounded-lg border border-white/5">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Est. Market Value
                  </span>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">
                    {result.estimated_market_value.toFixed(2)} {currency}
                  </p>
                </div>
                <div className="bg-[#16171f] p-3 rounded-lg border border-white/5">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Net Resale Margin
                  </span>
                  <p
                    className={`text-base font-bold mt-0.5 ${
                      result.resale_profit_margin > 0 ? 'text-indigo-400' : 'text-rose-400'
                    }`}
                  >
                    {result.resale_profit_margin > 0 ? '+' : ''}
                    {result.resale_profit_margin.toFixed(2)} {currency}
                  </p>
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                  Appraisal Reasoning:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed italic bg-indigo-600/10 p-3 rounded-lg border border-indigo-500/20">
                  "{result.reasoning}"
                </p>
              </div>

              {/* Condition flags */}
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Condition Notes &amp; Risk Flags:
                </span>
                <p className="text-xs text-slate-400 bg-white/5 p-2.5 rounded-lg border border-white/5">
                  {result.condition_notes}
                </p>
              </div>
            </div>

            <p className="text-[10px] font-mono text-slate-500 mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
              <span>ENGINE: GEMINI-2.5-FLASH</span>
              <span className="text-emerald-400 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                ONLINE
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
