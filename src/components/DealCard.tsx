import React from 'react';
import { ExternalLink, Tag, AlertCircle, TrendingUp, Sparkles, ShieldCheck } from 'lucide-react';
import { AnalyzedItem } from '../types';

interface DealCardProps {
  deal: AnalyzedItem;
  rank: number;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, rank }) => {
  const { item, analysis } = deal;

  const isMustBuy = analysis.verdict === 'MUST BUY';
  const isGoodDeal = analysis.verdict === 'GOOD DEAL';
  const isFairPrice = analysis.verdict === 'FAIR PRICE';

  const badgeStyle = isMustBuy
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : isGoodDeal
    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    : isFairPrice
    ? 'bg-white/5 text-slate-400 border-white/10'
    : 'bg-rose-500/20 text-rose-400 border-rose-500/30';

  const scoreTextColor = isMustBuy
    ? 'text-emerald-400'
    : isGoodDeal
    ? 'text-blue-400'
    : isFairPrice
    ? 'text-slate-400'
    : 'text-rose-400';

  const discountPercent = Math.round(
    ((analysis.estimated_market_value - item.price) / analysis.estimated_market_value) * 100
  );

  return (
    <div
      id={`deal-card-${item.id}`}
      className="bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden shadow-2xl hover:border-indigo-500/40 transition-all flex flex-col relative group"
    >
      {/* Subtle top glow accent line */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>

      {/* Header with image, rank, and score */}
      <div className="relative aspect-16/10 bg-[#16171f] overflow-hidden">
        <img
          src={item.image_url || 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80'}
          alt={item.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-300 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-black/40 pointer-events-none"></div>

        {/* Rank Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 font-mono">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#050507]/90 border border-white/10 backdrop-blur-md text-white">
            #{rank}
          </span>
        </div>

        {/* Verdict Pill */}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border uppercase backdrop-blur-md ${badgeStyle}`}>
            {analysis.verdict}
          </span>
        </div>

        {/* Discount tag if positive */}
        {discountPercent > 0 && (
          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-md">
            {discountPercent}% Below Comps
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Metadata tags */}
          <div className="flex items-center gap-2 mb-2 text-[11px] font-mono text-slate-400">
            <span className="text-indigo-300 font-semibold px-2 py-0.5 rounded bg-white/5 border border-white/5">
              {item.brand}
            </span>
            <span className="opacity-40">•</span>
            <span>Size: {item.size}</span>
            <span className="opacity-40">•</span>
            <span className="text-slate-400">Cond: {item.condition}</span>
          </div>

          {/* Title and Deal Score Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
              {item.title}
            </h3>
            <div className="text-right shrink-0">
              <div className={`text-2xl font-black ${scoreTextColor} leading-none font-mono`}>
                {analysis.deal_score}
                <span className="text-xs font-normal text-slate-500">/10</span>
              </div>
              <div className="text-[9px] text-slate-500 uppercase tracking-tighter mt-0.5 font-mono">
                Deal Score
              </div>
            </div>
          </div>

          {/* Pricing Comparison Grid */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-[#111218] rounded-lg border border-white/5 mb-3 font-mono">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Listed
              </p>
              <p className="text-xs font-bold text-slate-200 mt-0.5">
                {item.price.toFixed(2)} {item.currency}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Est. Market
              </p>
              <p className="text-xs font-bold text-emerald-400 mt-0.5">
                {analysis.estimated_market_value.toFixed(2)} {item.currency}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Est. Margin
              </p>
              <p
                className={`text-xs font-bold mt-0.5 ${
                  analysis.resale_profit_margin > 0 ? 'text-indigo-400' : 'text-rose-400'
                }`}
              >
                {analysis.resale_profit_margin > 0 ? '+' : ''}
                {analysis.resale_profit_margin.toFixed(2)}
              </p>
            </div>
          </div>

          {/* AI Appraisal Reasoning */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Gemini-2.5-Flash Appraisal</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed italic bg-indigo-600/5 p-3 rounded-lg border border-indigo-500/15">
              "{analysis.reasoning}"
            </p>
          </div>

          {/* Condition Notes */}
          <div className="flex items-start gap-1.5 text-[11px] text-slate-400 bg-white/5 p-2 rounded border border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-tight">{analysis.condition_notes}</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500">ID: #{item.id}</span>
          <a
            id={`view-listing-link-${item.id}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>View on Vinted</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
