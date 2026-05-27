import React, { useState } from "react";
import { UpbitCandle } from "../types";
import { runInBrowserBacktest, BacktestResult } from "../indicators";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Play, TrendingUp, AlertTriangle, ShieldCheck, Percent, HelpCircle } from "lucide-react";

interface BacktestEngineProps {
  candles: UpbitCandle[];
  coinName: string;
}

export function BacktestEngine({ candles, coinName }: BacktestEngineProps) {
  const [strategy, setStrategy] = useState("EMA_CROSS");
  const [backtestPeriod, setBacktestPeriod] = useState(100); // lookback length (30, 50, 100)
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  const triggerBacktest = () => {
    if (candles.length < 20) return;
    setCalculating(true);
    
    // Simulate minor calculation delay for pristine UX
    setTimeout(() => {
      // Use chosen period slice of historic candles (up to candle length)
      const subset = candles.slice(0, Math.min(candles.length, backtestPeriod));
      const outcome = runInBrowserBacktest(subset, strategy, 10000000); // 10,000,000 KRW seed
      setResult(outcome);
      setCalculating(false);
    }, 600);
  };

  return (
    <div id="backtest_engine_component" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full space-y-4">
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h4 className="text-white font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wide">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            전략 백테스팅 최적화 엔진 (Pro Backtest Optimizer)
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">Simulate Over History</span>
        </div>
        <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
          과거 {candles.length}개의 봉 데이터를 기준으로 특정 매매 법칙의 시뮬레이션을 수행하고 승률 및 최대 손실 낙폭을 시각화합니다.
        </p>
      </div>

      {/* Strategies Parameter Selections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">매매 기법</label>
          <select
            id="backtest_strategy_select"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="EMA_CROSS">EMA (20/50) 골든크로스 추종</option>
            <option value="RSI_BB">과매수/과매도 역추세 (RSI + BB)</option>
            <option value="BREAKOUT_VOL">거래량 폭발 돌파 매매</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-500 block mb-1">대조 분석 기간</label>
          <select
            id="backtest_period_select"
            value={backtestPeriod}
            onChange={(e) => setBacktestPeriod(parseInt(e.target.value))}
            className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="30">최근 30 봉 (단기 집중 시뮬레이션)</option>
            <option value="50">최근 50 봉 (중기 추세 통계)</option>
            <option value="100">최근 100 봉 (장기 신뢰성 검정)</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            id="run_backtest_btn"
            disabled={calculating || candles.length < 20}
            onClick={triggerBacktest}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded text-xs transition-all flex items-center justify-center gap-1 cursor-pointer hover:border hover:border-emerald-500/30"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            시뮬레이터 구동
          </button>
        </div>
      </div>

      {candles.length < 20 && (
        <div className="bg-yellow-905 bg-opacity-20 border border-yellow-800/40 p-2.5 rounded-lg flex items-start gap-2 text-[10.5px] text-yellow-500">
          <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-yellow-500" />
          <span>백테스트 연산에는 최소 20봉 이상의 캔들 데이터가 필요합니다.</span>
        </div>
      )}

      {/* Backtest findings cards */}
      {result && !calculating && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-center font-mono">
              <span className="text-[9px] text-slate-500">수익률 (Return)</span>
              <div
                className={`text-sm font-bold mt-0.5 ${
                  result.totalReturnPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {result.totalReturnPercent >= 0 ? "+" : ""}
                {result.totalReturnPercent.toFixed(2)}%
              </div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-center font-mono">
              <span className="text-[9px] text-slate-500">최종 평가 가치</span>
              <div className="text-white text-xs font-bold mt-0.5">
                {result.finalAsset.toLocaleString()} ₩
              </div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-center font-mono">
              <span className="text-[9px] text-slate-500">추정 승률 (Win Rate)</span>
              <div className="text-emerald-400 text-xs font-bold mt-0.5 flex items-center justify-center gap-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {result.winRate.toFixed(1)}%
              </div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-center font-mono">
              <span className="text-[9px] text-slate-500">최대 낙폭 (MDD)</span>
              <div className="text-rose-400 text-xs font-bold mt-0.5 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                {result.maxDrawdown.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Recharts chart overlay */}
          <div className="h-[140px] w-full bg-slate-950/80 rounded-lg p-2 border border-slate-800">
            <span className="text-[9px] text-slate-500 font-mono mb-1 block">모의 투자 수익 곡선 추이 (Seed: 10M KRW)</span>
            <ResponsiveContainer width="100%" height="86%">
              <AreaChart data={result.history}>
                <defs>
                  <linearGradient id="backtestGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={9} />
                <YAxis hide stroke="#64748b" fontSize={9} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }}
                  labelStyle={{ fontSize: "10px", color: "#94a3b8" }}
                  itemStyle={{ fontSize: "10px", color: "#10b981" }}
                  formatter={(val: any) => `${parseInt(val).toLocaleString()} ₩`}
                />
                <Area
                  type="monotone"
                  dataKey="portfolioValue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#backtestGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {calculating && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-xs">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-mono">가상 체결 테스트 실행 원장 생성 중...</p>
        </div>
      )}

      {!result && !calculating && (
        <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
          매매 기법과 기간을 설정한 후 시뮬레이터 구동 버튼을 클릭하세요.
        </div>
      )}
    </div>
  );
}
