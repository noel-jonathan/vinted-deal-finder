export interface VintedItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  brand: string;
  size: string;
  condition: string;
  description: string;
  url: string;
  image_url: string;
}

export type DealVerdict = 'MUST BUY' | 'GOOD DEAL' | 'FAIR PRICE' | 'OVERPRICED';

export interface DealAnalysis {
  estimated_market_value: number;
  deal_score: number;
  condition_notes: string;
  resale_profit_margin: number;
  verdict: DealVerdict;
  reasoning: string;
}

export interface AnalyzedItem {
  item: VintedItem;
  analysis: DealAnalysis;
}

export interface CodeFile {
  name: string;
  language: string;
  description: string;
  content: string;
}
