import React from "react";
import { IndicatorState } from "../types";
import { Activity, ShieldAlert, Compass, Gauge } from "lucide-react";

interface IndicatorSummaryProps {
  indicators: IndicatorState;
  currentPrice: number;
}

export function IndicatorSummary({ indicators, currentPrice }: IndicatorSummaryProps) {
  const {
    rsi,
    ema20,
    ema50,
    bbUpper,
    bbMiddle,
    bbLower,
    priceChangePercent,
    currentTrend,
  } = indicators;

  // Derive custom human/pro warnings and cues
  let rsiState = "Neutral (적정)";
  let rsiColor = "text-slate-400";
  let rsiAlertBg = "bg-slate-950/40";
  if (rsi >= 70) {
    rsiState = "Overbought (과매수 상태)";
    rsiColor = "text-rose-400 font-bold animate-pulse";
    rsiAlertBg = "bg-rose-950/20 border border-rose-900/30";
  } else if (rsi <= 30) {
    rsiState = "Oversold (과매도 상태)";
    rsiColor = "text-emerald-400 font-bold animate-pulse";
    rsiAlertBg = "bg-emerald-950/20 border border-emerald-900/30";
  }

  const bbPercent = bbUpper - bbLower > 0 ? ((currentPrice - bbLower) / (bbUpper - bbLower)) * 100 : 50;

  let bbStatus = "안정적 밴드 내 매매";
  let bbColor = "text-slate-300";
  if (currentPrice >= bbUpper) {
    bbStatus = "상단 돌파 (과열 저항선)";
    bbColor = "text-rose-400 font-bold";
  } else if (currentPrice <= bbLower) {
    bbStatus = "하단 이탈 (반등 지지선)";
    bbColor = "text-emerald-400 font-bold";
  }

  const emaCross = ema20 - ema50;
  let trendAlert = "혼조세 (Sideways)";
  let trendColor = "text-amber-500 bg-amber-500/10";
  if (currentTrend === "BULLISH") {
    trendAlert = "강한 정배열 (Golden Cross)";
    trendColor = "text-emerald-400 bg-emerald-400/10";
  } else if (currentTrend === "BEARISH") {
    trendAlert = "완전 역배열 (Death Cross)";
    trendColor = "text-rose-400 bg-rose-400/10";
  }

  return (
    <div id="indicator_summary_component" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h4 className="text-white font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wide">
          <Activity className="w-4 h-4 text-emerald-500" />
          Pro-Market Indicators (기술적 지표 분석)
        </h4>
        <span className="text-[10px] text-slate-500 font-mono">Real-Time Calculus</span>
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-2 gap-3">
        {/* RSI 14 Card */}
        <div className={`p-3 rounded-lg ${rsiAlertBg} flex flex-col justify-between transition-all`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium font-sans">Relative Strength Index (RSI)</span>
            <Gauge className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-mono font-bold ${rsiColor}`}>
                {rsi.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">/ 100</span>
            </div>
            <p className={`text-[10px] mt-1 ${rsiColor}`}>{rsiState}</p>
          </div>
        </div>

        {/* Bollinger Bands Card */}
        <div className="p-3 bg-slate-950/40 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">Bollinger Bands (20, 2)</span>
            <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-[11px] font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-[9px] text-slate-500">밴드 상단</span>
                <span>{bbUpper.toLocaleString()} ₩</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-slate-500">밴드 하단</span>
                <span>{bbLower.toLocaleString()} ₩</span>
              </div>
            </div>
            <p className={`text-[10px] mt-1.5 font-sans ${bbColor}`}>{bbStatus}</p>
          </div>
        </div>
      </div>

      {/* Trend Overlay Progress bars */}
      <div className="bg-slate-950/60 p-3 rounded-lg space-y-2.5">
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-slate-400">볼린저 밴드 이격 위치 ({bbPercent.toFixed(0)}%)</span>
            <span className="text-slate-400 font-mono">하단 0% ... 상단 100%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                bbPercent > 80
                  ? "bg-rose-500"
                  : bbPercent < 20
                  ? "bg-emerald-500"
                  : "bg-teal-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, bbPercent))}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
            <div className="text-[9px] text-slate-500">지선 EMA 20</div>
            <div className="text-white font-medium">{ema20 > 0 ? `${ema20.toLocaleString()} ₩` : "-"}</div>
          </div>
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
            <div className="text-[9px] text-slate-500">대선 EMA 50</div>
            <div className="text-white font-medium">{ema50 > 0 ? `${ema50.toLocaleString()} ₩` : "-"}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
          <span className="text-slate-400 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            EMA 배열 Trend:
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold text-center ${trendColor}`}>
            {trendAlert}
          </span>
        </div>
      </div>
    </div>
  );
}
