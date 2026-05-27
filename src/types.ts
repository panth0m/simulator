export interface CoinMarket {
  market: string;
  korean_name: string;
  english_name: string;
}

export interface UpbitCandle {
  market: string;
  candle_date_time_utc: string;
  candle_date_time_kst: string;
  opening_price: number;
  high_price: number;
  low_price: number;
  trade_price: number;
  timestamp: number;
  candle_acc_trade_price: number;
  candle_acc_trade_volume: number;
  unit?: number;
}

export interface IndicatorState {
  rsi: number;
  ema20: number;
  ema50: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  priceChangePercent: number;
  volumeChangePercent: number;
  currentTrend: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface Position {
  amount: number;
  averagePrice: number;
  currentPrice: number;
  market: string;
  coinName: string;
}

export interface WalletState {
  cash: number; // KRW balance
  positions: { [market: string]: Position };
  initialCash: number;
}

export interface TradeHistory {
  id: string;
  timestamp: number;
  type: "BUY" | "SELL";
  market: string;
  coinName: string;
  price: number;
  amount: number;
  totalCost: number;
  strategy: string;
  auto: boolean; // Managed by computer bot OR manually executed
  aiSignal?: boolean;
}

export interface AIAnalysisResult {
  recommendation: "BUY" | "SELL" | "HOLD";
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  trendAnalysis: string;
  indicatorReview: string;
  masterTradeSecret: string;
  timestamp: number;
  loading?: boolean;
}

export type TradingStrategyType = "EMA_CROSS" | "RSI_BB" | "BREAKOUT_VOL" | "GEMINI_AI";
