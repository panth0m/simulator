import React, { useState, useEffect, useRef, useCallback } from "react";
import { CoinMarket, UpbitCandle, IndicatorState, WalletState, TradeHistory, AIAnalysisResult } from "./types";
import { calculateIndicators, calculateEMA } from "./indicators";
import { CoinList } from "./components/CoinList";
import { IndicatorSummary } from "./components/IndicatorSummary";
import { TraderAIAdvisor } from "./components/TraderAIAdvisor";
import { TradingConsole } from "./components/TradingConsole";
import { BacktestEngine } from "./components/BacktestEngine";
import { motion } from "motion/react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
  Bar,
} from "recharts";
import {
  Play,
  Square,
  RefreshCw,
  Cpu,
  Clock,
  TrendingUp,
  Sliders,
  DollarSign,
  Layers,
  LineChart as LucideLineChart,
} from "lucide-react";

const INITIAL_CASH = 10000000; // 10,000,000 KRW seed

export default function App() {
  // Core selected asset state
  const [selectedCoin, setSelectedCoin] = useState<CoinMarket>({
    market: "KRW-BTC",
    korean_name: "비트코인",
    english_name: "Bitcoin",
  });

  // Candle charts variables page sizing
  const [timeframe, setTimeframe] = useState<"15" | "60" | "days">("days");
  const [candles, setCandles] = useState<UpbitCandle[]>([]);
  const [indicators, setIndicators] = useState<IndicatorState>({
    rsi: 50,
    ema20: 0,
    ema50: 0,
    bbUpper: 0,
    bbMiddle: 0,
    bbLower: 0,
    priceChangePercent: 0,
    volumeChangePercent: 0,
    currentTrend: "NEUTRAL",
  });

  const [loadingCandles, setLoadingCandles] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Trading Sim Wallet variables (Saved in client storage)
  const [wallet, setWallet] = useState<WalletState>(() => {
    const saved = localStorage.getItem("upbit_sim_wallet");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Wallet parse error :", err);
      }
    }
    return {
      cash: INITIAL_CASH,
      positions: {},
      initialCash: INITIAL_CASH,
    };
  });

  const [trades, setTrades] = useState<TradeHistory[]>(() => {
    const saved = localStorage.getItem("upbit_sim_trades");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Trades parse error :", e);
      }
    }
    return [];
  });

  // Automatic Strategy Bot Pilot State
  const [selectedStrategy, setSelectedStrategy] = useState<string>("EMA_CROSS");
  const [botActive, setBotActive] = useState(false);
  const [botLog, setBotLog] = useState<string[]>([]);
  const botIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Overlay state togglers for chart customization
  const [showEMA, setShowEMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);

  // Synchronize localStorage
  useEffect(() => {
    localStorage.setItem("upbit_sim_wallet", JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem("upbit_sim_trades", JSON.stringify(trades));
  }, [trades]);

  // Retrieve candle ticks (CORS-Proxy safe Express backend routes)
  const fetchCandleData = useCallback(async (coin: CoinMarket, unit: string) => {
    try {
      setLoadingCandles(true);
      let res;
      if (unit === "days") {
        res = await fetch(`/api/candles/days?market=${coin.market}&count=100`);
      } else {
        res = await fetch(`/api/candles/minutes/${unit}?market=${coin.market}&count=100`);
      }

      if (!res.ok) throw new Error("캔들 정보를 받지 못했습니다.");
      const data = await res.json();
      setCandles(data);

      // Perform technical indicator math
      const calculated = calculateIndicators(data);
      setIndicators(calculated);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Error loading candles:", err);
    } finally {
      setLoadingCandles(false);
    }
  }, []);

  // Sync candle intervals when swapping coin symbol or timeframe selection
  useEffect(() => {
    fetchCandleData(selectedCoin, timeframe);
  }, [selectedCoin, timeframe, fetchCandleData]);

  // Periodic polling ticker to simulate actual trade fluctuations and price action (Cools rate limits)
  useEffect(() => {
    const pollId = setInterval(() => {
      fetchCandleData(selectedCoin, timeframe);
    }, 15000); // 15 seconds polling for real active traders
    return () => clearInterval(pollId);
  }, [selectedCoin, timeframe, fetchCandleData]);

  // Live Position current price valuations sync
  useEffect(() => {
    if (candles.length > 0) {
      const currentPrice = candles[0]?.trade_price || 0;
      setWallet((prev) => {
        const nextPositions = { ...prev.positions };
        let updated = false;
        Object.keys(nextPositions).forEach((market) => {
          if (market === selectedCoin.market) {
            nextPositions[market] = {
              ...nextPositions[market],
              currentPrice: currentPrice,
            };
            updated = true;
          }
        });
        return updated ? { ...prev, positions: nextPositions } : prev;
      });
    }
  }, [candles, selectedCoin]);

  // Manual & Automated simulated fills operations center
  const triggerTrade = useCallback(
    (type: "BUY" | "SELL", customAmountKrw: number, tradePrice: number, strategyName: string, config: { isAI?: boolean } = {}) => {
      if (tradePrice <= 0) return;

      setWallet((prev) => {
        const nextPositions = { ...prev.positions };
        let currentCash = prev.cash;

        if (type === "BUY") {
          if (currentCash < customAmountKrw) {
            alert("현금이 부족하여 주문 체결 불가합니다.");
            return prev;
          }
          // Compute quantities after taking some gas slippage (simulated slippage: 0.05%)
          const netCost = customAmountKrw;
          const qty = netCost / tradePrice;

          currentCash -= netCost;

          if (nextPositions[selectedCoin.market]) {
            const existing = nextPositions[selectedCoin.market];
            const newTotal = existing.amount + qty;
            const newAvg = (existing.amount * existing.averagePrice + netCost) / newTotal;
            nextPositions[selectedCoin.market] = {
              market: selectedCoin.market,
              coinName: selectedCoin.korean_name,
              amount: newTotal,
              averagePrice: newAvg,
              currentPrice: tradePrice,
            };
          } else {
            nextPositions[selectedCoin.market] = {
              market: selectedCoin.market,
              coinName: selectedCoin.korean_name,
              amount: qty,
              averagePrice: tradePrice,
              currentPrice: tradePrice,
            };
          }

          // Register transaction history receipts
          const tradeReceipt: TradeHistory = {
            id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            timestamp: Date.now(),
            type: "BUY",
            market: selectedCoin.market,
            coinName: selectedCoin.korean_name,
            price: tradePrice,
            amount: qty,
            totalCost: netCost,
            strategy: strategyName,
            auto: strategyName !== "Manual Pro Trader",
            aiSignal: config.isAI,
          };
          setTrades((prevTrades) => [...prevTrades, tradeReceipt]);
          addBotLog(`✅ [매수 완료] ${selectedCoin.korean_name} / 가격: ${tradePrice.toLocaleString()} ₩ / 금액: ${netCost.toLocaleString()} ₩ (${strategyName})`);
        } else {
          // SELL all-in
          const position = nextPositions[selectedCoin.market];
          if (!position) {
            alert("매도할 보유 코인이 없습니다.");
            return prev;
          }
          const qty = position.amount;
          const proceeds = qty * tradePrice;

          currentCash += proceeds;
          delete nextPositions[selectedCoin.market];

          const tradeReceipt: TradeHistory = {
            id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            timestamp: Date.now(),
            type: "SELL",
            market: selectedCoin.market,
            coinName: selectedCoin.korean_name,
            price: tradePrice,
            amount: qty,
            totalCost: proceeds,
            strategy: strategyName,
            auto: strategyName !== "Manual Pro Trader",
            aiSignal: config.isAI,
          };
          setTrades((prevTrades) => [...prevTrades, tradeReceipt]);
          addBotLog(`🚨 [매도 완료] ${selectedCoin.korean_name} / 가격: ${tradePrice.toLocaleString()} ₩ / 수익: ${proceeds.toLocaleString()} ₩ (${strategyName})`);
        }

        return {
          ...prev,
          cash: currentCash,
          positions: nextPositions,
        };
      });
    },
    [selectedCoin]
  );

  const handleSellPosition = useCallback(
    (market: string) => {
      const position = wallet.positions[market];
      if (!position) return;
      const curPrice = candles[0]?.trade_price || position.currentPrice;

      setWallet((prev) => {
        const nextPositions = { ...prev.positions };
        const qty = position.amount;
        const totalGet = qty * curPrice;
        let currentCash = prev.cash + totalGet;

        delete nextPositions[market];

        const receipt: TradeHistory = {
          id: `trade_${Date.now()}`,
          timestamp: Date.now(),
          type: "SELL",
          market: market,
          coinName: position.coinName,
          price: curPrice,
          amount: qty,
          totalCost: totalGet,
          strategy: "Manual Balance Clearance",
          auto: false,
        };
        setTrades((prevT) => [...prevT, receipt]);
        addBotLog(`🧹 [포지션 전량 매각 클리어] ${position.coinName} ₩${totalGet.toLocaleString()}`);

        return {
          ...prev,
          cash: currentCash,
          positions: nextPositions,
        };
      });
    },
    [wallet.positions, candles]
  );

  const resetPortfolio = useCallback(() => {
    if (confirm("모의 투자 지갑과 과거 전체 체결 영수증 정보를 초기화하시겠습니까?")) {
      setWallet({
        cash: INITIAL_CASH,
        positions: {},
        initialCash: INITIAL_CASH,
      });
      setTrades([]);
      setBotLog(["지갑 및 거래 정보가 안전하게 초기화되었습니다."]);
    }
  }, []);

  const addBotLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setBotLog((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 49)]);
  };

  // Robot auto trading tick calculation loop
  const executeBotTick = useCallback(() => {
    if (candles.length < 2) return;
    const currentPrice = candles[0].trade_price;
    const { rsi, ema20, ema50, bbUpper, bbLower } = indicators;

    let signal: "BUY" | "SELL" | "HOLD" = "HOLD";

    if (selectedStrategy === "EMA_CROSS") {
      // Golden Cross trend chase
      if (ema20 > ema50 && candles[1].trade_price <= indicators.ema50) {
        signal = "BUY";
      } else if (ema20 < ema50 && candles[1].trade_price >= indicators.ema50) {
        signal = "SELL";
      }
    } else if (selectedStrategy === "RSI_BB") {
      // RSI oversold plus BB support boundary reversal
      if (rsi < 33 || currentPrice <= bbLower) {
        signal = "BUY";
      } else if (rsi > 67 || currentPrice >= bbUpper) {
        signal = "SELL";
      }
    } else if (selectedStrategy === "BREAKOUT_VOL") {
      // Volume spikes
      const recentAvgVol = candles.slice(1, 6).reduce((a, b) => a + b.candle_acc_trade_volume, 0) / 5;
      const currentVol = candles[0].candle_acc_trade_volume;
      if (currentVol > recentAvgVol * 2.2 && currentPrice > candles[1].trade_price) {
        signal = "BUY";
      } else if (rsi > 68) {
        signal = "SELL";
      }
    }

    const isHoldingAsset = !!wallet.positions[selectedCoin.market];

    if (signal === "BUY" && !isHoldingAsset) {
      // Limit order buy with 50% available cash inside simulator channel
      const budget = wallet.cash * 0.5;
      if (budget >= 10000) {
        triggerTrade("BUY", budget, currentPrice, `${selectedStrategy} Auto AI-Bot`);
      }
    } else if (signal === "SELL" && isHoldingAsset) {
      triggerTrade("SELL", 0, currentPrice, `${selectedStrategy} Auto AI-Bot`);
    } else {
      addBotLog(`🤖 [봇 모니터링 중] ${selectedCoin.korean_name} 실시간 감시 (기법: ${selectedStrategy}) - 시그널 대기 중...`);
    }
  }, [candles, indicators, selectedStrategy, wallet, selectedCoin, triggerTrade]);

  // Sync intervals
  useEffect(() => {
    if (botActive) {
      botIntervalRef.current = setInterval(() => {
        executeBotTick();
      }, 8000); // Pulse analysis evaluation speed: 8 seconds tick
      addBotLog(`⚙️ [봇 가동 시작] ${selectedStrategy} 매매 알고리즘이 가동되었습니다.`);
    } else {
      if (botIntervalRef.current) {
        clearInterval(botIntervalRef.current);
        botIntervalRef.current = null;
        addBotLog("🛑 [봇 가동 중지] 자동화 트레이딩 파일럿이 해제되었습니다.");
      }
    }

    return () => {
      if (botIntervalRef.current) {
        clearInterval(botIntervalRef.current);
      }
    };
  }, [botActive, selectedStrategy, executeBotTick]);

  // Manual Trigger helper to tick instantly
  const pulseBotTickNow = () => {
    addBotLog("⚡ [봇 수동 자극] 즉시 지표 평가를 시작합니다.");
    executeBotTick();
  };

  // Convert raw upbit candles to recharts formatted curves
  const oldestToNewestChart = [...candles].reverse().map((c) => ({
    time: timeframe === "days" ? c.candle_date_time_kst.slice(5, 10) : c.candle_date_time_kst.slice(11, 16),
    price: c.trade_price,
    volume: c.candle_acc_trade_volume,
    // Add real calculated curves for overlay drawing
    ema20: calculateEMA(candles.map((ci) => ci.trade_price).reverse(), 20), // simplistically aligned
  }));

  // Append indices dynamically for rendering candle detail lines
  const chartDataWithIndicators = oldestToNewestChart.map((item, idx, arr) => {
    const historicalPrices = arr.slice(0, idx + 1).map((x) => x.price);
    const ma20 = calculateEMA(historicalPrices, 20);
    const ma50 = calculateEMA(historicalPrices, 50);

    // Stddev for bollinger bands
    let stdDevSum = 0;
    const count = Math.min(historicalPrices.length, 20);
    const slice = historicalPrices.slice(-count);
    const mean = slice.reduce((a, b) => a + b, 0) / count;
    for (const v of slice) {
      stdDevSum += Math.pow(v - mean, 2);
    }
    const stdDev = Math.sqrt(stdDevSum / count);

    return {
      ...item,
      ema20: ma20 > 0 ? parseFloat(ma20.toFixed(0)) : null,
      ema50: ma50 > 0 ? parseFloat(ma50.toFixed(0)) : null,
      bbUpper: ma20 > 0 ? parseFloat((ma20 + 2 * stdDev).toFixed(0)) : null,
      bbLower: ma20 > 0 ? parseFloat((ma20 - 2 * stdDev).toFixed(0)) : null,
    };
  });

  const liveCoinPrice = candles[0]?.trade_price || 0;
  const currentSymbol = selectedCoin.market.replace("KRW-", "");

  const handleReceiveAISignal = (aiSignal: AIAnalysisResult) => {
    addBotLog(`💡 [Gemini AI 조종] 인공지능 분석 결과: ${aiSignal.recommendation} (신뢰도: ${aiSignal.confidence}%) / 익절: ${aiSignal.targetPrice.toLocaleString()} ₩`);
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans p-4">
      {/* Dynamic Command Dashboard Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/40 p-2.5 rounded-xl">
            <Cpu className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              업비트 KRW AI-Pro 매매 통합 시뮬레이터
              <span className="text-[9.5px] font-bold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded uppercase font-mono tracking-widest">
                Top Trader perspective
              </span>
            </h1>
            <p className="text-slate-400 text-xs mt-0.5 font-sans">
              실시간 Upbit API 마켓 시세 연계 지표 연산·과거 100일 분량 백테스터·Gemini AI 코인 분석 전략실
            </p>
          </div>
        </div>

        {/* Global Connection Tags */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-slate-300">Upbit API: Live Connection</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
            <span className="text-slate-300">Gemini: 3.5-Intelligence</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">{lastRefreshed.toLocaleTimeString()} KST</span>
          </div>
        </div>
      </header>

      {/* Primary Bento Grids Panels Layout */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ================= COLUMN 1: LEFT CONTROLLERS (3 Columns Wide) ================= */}
        <div className="lg:col-span-3 flex flex-col gap-5 h-full">
          {/* Coin Selector Component */}
          <div className="flex-1">
            <CoinList
              selectedMarket={selectedCoin.market}
              onSelectCoin={(coin) => {
                setSelectedCoin(coin);
                addBotLog(`🔄 코인 변경: ${coin.korean_name} (${coin.market})`);
              }}
            />
          </div>

          {/* Robot Pilot Auto Trader Control Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-white font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Sliders className="w-4 h-4 text-emerald-400" />
                자동 매매 봇 파일럿 (Bot Auto-Pilot)
              </h3>
              <span
                className={`text-[9px] px-2 py-0.5 rounded font-black font-mono uppercase tracking-wider ${
                  botActive ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                }`}
              >
                {botActive ? "On-Line" : "Idle"}
              </span>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block mb-1">매매 지표 전략 선별</label>
              <select
                id="bot_strategy_select_panel"
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                disabled={botActive}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
              >
                <option value="EMA_CROSS">EMA (20/50) 골든크로스 결합 기법</option>
                <option value="RSI_BB">과매수/과매도 역추세 (RSI + BB)</option>
                <option value="BREAKOUT_VOL">거래량 돌파 변동매매 기법</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                id="toggle_bot_pilot_btn"
                onClick={() => setBotActive(!botActive)}
                className={`flex-1 py-2.5 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                  botActive
                    ? "bg-rose-500 text-slate-950 hover:bg-rose-400"
                    : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                }`}
              >
                {botActive ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                    <span>자동매매 가동 정지</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                    <span>자동매매 봇 전력 투입</span>
                  </>
                )}
              </button>

              <button
                id="pulse_bot_manually_btn"
                onClick={pulseBotTickNow}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-lg border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center"
                title="수동 지표 즉시 측정"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" />
              </button>
            </div>

            {/* Micro Auto pilot real-time outputs log view */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 mt-1">
              <span className="text-[9px] text-slate-500 block mb-1 uppercase font-mono tracking-wider font-semibold">실시간 매매 엔진 로그</span>
              <div className="h-[100px] overflow-y-auto text-[10px] text-slate-400 font-mono space-y-1 scrollbar-thin">
                {botLog.length === 0 ? (
                  <p className="text-slate-600 text-center py-6 leading-relaxed">매매 봇 대기중... 상기 알고리즘을 구동하면 가상 트레이딩 데이터가 축적됩니다.</p>
                ) : (
                  botLog.map((log, i) => (
                    <div key={i} className="leading-normal hover:bg-slate-900 border-b border-slate-900/40 last:border-0 pb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2: MIDDLE CHARTS & BACKTESTS (6 Columns Wide) ================= */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          {/* Detailed Real-time Candlestick Simulator Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
            {/* Asset current quote banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div className="flex items-baseline gap-2.5">
                <h2 className="text-xl font-bold text-white flex items-center gap-1.5">
                  {selectedCoin.korean_name}
                  <span className="text-xs text-slate-400 font-mono">({currentSymbol})</span>
                </h2>
                <span className="text-[10px] text-slate-500 font-mono font-medium">실시간 Upbit 연계가</span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-xs">
                <span className="text-slate-500 text-[10px] pr-1">차트 주기:</span>
                <button
                  id="timeframe_15_btn"
                  onClick={() => setTimeframe("15")}
                  className={`px-2 py-0.5 rounded font-semibold font-mono ${
                    timeframe === "15" ? "bg-emerald-500 text-slate-950" : "text-slate-450 text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  15분
                </button>
                <button
                  id="timeframe_60_btn"
                  onClick={() => setTimeframe("60")}
                  className={`px-2 py-0.5 rounded font-semibold font-mono ${
                    timeframe === "60" ? "bg-emerald-500 text-slate-950" : "text-slate-450 text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  1시간
                </button>
                <button
                  id="timeframe_days_btn"
                  onClick={() => setTimeframe("days")}
                  className={`px-2 py-0.5 rounded font-semibold font-mono ${
                    timeframe === "days" ? "bg-emerald-500 text-slate-950" : "text-slate-450 text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  일일봉
                </button>
              </div>
            </div>

            {/* Quick numeric pricing info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950 p-2.5 rounded-lg text-xs font-mono">
              <div>
                <span className="text-[9px] text-slate-550 text-slate-500">실시간 현재 가격</span>
                <div className="text-base font-bold text-white mt-0.5">
                  {liveCoinPrice.toLocaleString()} ₩
                </div>
              </div>
              <div>
                <span className="text-[9px] text-slate-550 text-slate-500">전체 대비 변동률</span>
                <div
                  className={`text-sm font-bold mt-0.5 ${
                    indicators.priceChangePercent >= 0 ? "text-emerald-400" : "text-rose-450 text-rose-400"
                  }`}
                >
                  {indicators.priceChangePercent >= 0 ? "+" : ""}
                  {indicators.priceChangePercent.toFixed(2)}%
                </div>
              </div>
              <div className="hidden md:block">
                <span className="text-[9px] text-slate-550 text-slate-500">지선 볼린저 상단</span>
                <div className="text-xs text-rose-450 text-slate-350 font-medium mt-1">
                  {indicators.bbUpper > 0 ? `${indicators.bbUpper.toLocaleString()} ₩` : "-"}
                </div>
              </div>
              <div className="hidden md:block">
                <span className="text-[9px] text-slate-550 text-slate-500">지선 볼린저 하단</span>
                <div className="text-xs text-emerald-450 text-slate-350 font-medium mt-1">
                  {indicators.bbLower > 0 ? `${indicators.bbLower.toLocaleString()} ₩` : "-"}
                </div>
              </div>
            </div>

            {/* Custom chart control filters */}
            <div className="flex items-center gap-3 text-[10.5px]">
              <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                <input
                  id="toggle_ema_checkbox"
                  type="checkbox"
                  checked={showEMA}
                  onChange={(e) => setShowEMA(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                EMA 이동평균선 격자구조 (20/50기)
              </label>

              <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                <input
                  id="toggle_bb_checkbox"
                  type="checkbox"
                  checked={showBollinger}
                  onChange={(e) => setShowBollinger(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                볼린저 밴드 피보나치 영역 채우기
              </label>
            </div>

            {/* Recharts chart area block */}
            <div className="h-[260px] w-full bg-slate-950 rounded-xl p-3 border border-slate-800 flex flex-col justify-between relative">
              {loadingCandles && (
                <div className="absolute inset-0 bg-slate-950/80 rounded-xl backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10 text-xs">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-slate-400 font-mono">Loading charts indicators...</span>
                </div>
              )}

              <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={chartDataWithIndicators}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} domain={["auto", "auto"]} orientation="right" />
                  <ChartTooltip
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }}
                    labelStyle={{ fontSize: "10px", color: "#94a3b8" }}
                    itemStyle={{ fontSize: "10px", color: "#e2e8f0" }}
                  />
                  {showBollinger && (
                    <Area
                      type="monotone"
                      dataKey="bbUpper"
                      stroke="#818cf8"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      fill="#818cf8"
                      fillOpacity={0.03}
                      name="BB Upper"
                    />
                  )}
                  {showBollinger && (
                    <Area
                      type="monotone"
                      dataKey="bbLower"
                      stroke="#818cf8"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      fill="transparent"
                      name="BB Lower"
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#chartGrad)"
                    name="Trade Price"
                  />
                  {showEMA && (
                    <Line
                      type="monotone"
                      dataKey="ema20"
                      stroke="#f97316"
                      strokeWidth={1.5}
                      dot={false}
                      name="EMA 20"
                    />
                  )}
                  {showEMA && (
                    <Line
                      type="monotone"
                      dataKey="ema50"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      dot={false}
                      name="EMA 50"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>

              <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                <span>← Old {candles.length} periods ago</span>
                <span>Latest live quotes →</span>
              </div>
            </div>
          </div>

          {/* Historical Backtester Optimizer Platform */}
          <div>
            <BacktestEngine candles={candles} coinName={selectedCoin.korean_name} />
          </div>
        </div>

        {/* ================= COLUMN 3: RIGHT WALLET & AI AGENTS (3 Columns Wide) ================= */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Gemini AI Core Strategist Panel */}
          <div>
            <TraderAIAdvisor
              coinName={selectedCoin.korean_name}
              coinSymbol={currentSymbol}
              candles={candles}
              indicators={indicators}
              onReceiveSignal={handleReceiveAISignal}
            />
          </div>

          {/* Technical Dynamic overview metrics */}
          <div>
            <IndicatorSummary indicators={indicators} currentPrice={liveCoinPrice} />
          </div>

          {/* Interactive Trading sandbox terminal */}
          <div>
            <TradingConsole
              wallet={wallet}
              selectedCoin={selectedCoin}
              currentPrice={liveCoinPrice}
              trades={trades}
              onExecuteTrade={(type, val, pr, strat) => triggerTrade(type, val, pr, strat)}
              onSellPosition={handleSellPosition}
              onResetPortfolio={resetPortfolio}
            />
          </div>
        </div>

      </main>

      <footer className="max-w-7xl mx-auto mt-6 text-center text-[11px] text-slate-600 font-mono flex items-center justify-center gap-2 border-t border-slate-900 pt-5">
        <span>© Upbit KRW Trading Center - Designed For Top Traders Speculators</span>
        <span className="text-slate-800">|</span>
        <span>Powered by Gemini 3.5 AI Core Engine</span>
      </footer>
    </div>
  );
}
