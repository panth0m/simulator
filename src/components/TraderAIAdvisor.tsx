import React, { useState } from "react";
import { UpbitCandle, IndicatorState, AIAnalysisResult } from "../types";
import { Brain, Sparkles, CheckCircle2, ShieldAlert, AlertCircle } from "lucide-react";

interface TraderAIAdvisorProps {
  coinName: string;
  coinSymbol: string;
  candles: UpbitCandle[];
  indicators: IndicatorState;
  onReceiveSignal: (signal: AIAnalysisResult) => void;
}

export function TraderAIAdvisor({
  coinName,
  coinSymbol,
  candles,
  indicators,
  onReceiveSignal,
}: TraderAIAdvisorProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);

  const requestAnalysis = async () => {
    if (candles.length < 5) return;
    try {
      setLoading(true);
      setErrorHeader(null);

      const res = await fetch("/api/trading/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coinSymbol,
          coinName,
          candles,
          indicators,
        }),
      });

      if (!res.ok) {
        throw new Error("서버에서 AI 분석 보고서를 받아오지 못했습니다.");
      }

      const data = (await res.json()) as AIAnalysisResult;
      setResult(data);
      onReceiveSignal(data);
    } catch (err: any) {
      console.error(err);
      setErrorHeader(err.message || "Gemini Connection Interrupted");
    } finally {
      setLoading(false);
    }
  };

  const borderAccent =
    result?.recommendation === "BUY"
      ? "border-emerald-500/40 bg-emerald-950/10"
      : result?.recommendation === "SELL"
      ? "border-rose-500/40 bg-rose-950/10"
      : "border-slate-800 bg-slate-900/60";

  return (
    <div id="ai_advisor_widget" className={`border border-slate-800 rounded-xl p-4 flex flex-col h-full bg-slate-900 justify-between gap-3`}>
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <h3 className="text-white font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wide">
            <Brain className="w-4 h-4 text-emerald-400" />
            Gemini AI 탑트레이더 전략 비서
          </h3>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
            <Sparkles className="w-3 h-3 animate-pulse" />
            Gemini 3.5 Active
          </span>
        </div>

        {/* Action Trigger Button */}
        <div className="mt-4">
          <button
            id="trigger_ai_analysis_btn"
            disabled={loading || candles.length === 0}
            onClick={requestAnalysis}
            className="w-full relative px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>차트 데이터 패턴 해독 중...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>탑트레이더 가치분석 보고서 생성 (Gemini AI)</span>
              </>
            )}
          </button>
        </div>

        {errorHeader && (
          <div className="mt-3 text-[11px] text-amber-400 bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/40 flex items-start gap-1.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              {errorHeader}. .env.example를 확인하거나 AI 제안서가 안전 매매 한계선을 설정하는 중인지 점검하세요.
            </span>
          </div>
        )}

        {/* AI report output display */}
        {!loading && result && (
          <div className={`mt-4 rounded-lg p-3 border ${borderAccent} space-y-3.5 transition-all text-xs`}>
            {/* Top recommendation summary */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">포지션 제안</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-sm font-black px-2.5 py-0.5 rounded ${
                    result.recommendation === "BUY"
                      ? "bg-emerald-500 text-slate-950"
                      : result.recommendation === "SELL"
                      ? "bg-rose-500 text-slate-950"
                      : "bg-slate-800 text-amber-400"
                  }`}
                >
                  {result.recommendation}
                </span>

                <span className="text-[11px] text-slate-400 font-mono">
                  (신뢰도 {result.confidence}%)
                </span>
              </div>
            </div>

            {/* Confidence progress */}
            <div>
              <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.recommendation === "BUY"
                      ? "bg-emerald-500"
                      : result.recommendation === "SELL"
                      ? "bg-rose-500"
                      : "bg-amber-400"
                  }`}
                  style={{ width: `${result.confidence}%` }}
                ></div>
              </div>
            </div>

            {/* Dynamic targets */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-slate-950/40 p-2 rounded">
                <div className="text-[9px] text-slate-500">지정 익절가 (Target)</div>
                <div className="text-emerald-400 font-bold">{result.targetPrice ? `${result.targetPrice.toLocaleString()} ₩` : "-"}</div>
              </div>
              <div className="bg-slate-950/40 p-2 rounded">
                <div className="text-[9px] text-slate-500">손절 제한선 (Stop Loss)</div>
                <div className="text-rose-400 font-bold">{result.stopLoss ? `${result.stopLoss.toLocaleString()} ₩` : "-"}</div>
              </div>
            </div>

            {/* Analyst's block quotes */}
            <div className="space-y-2 text-[11px] leading-relaxed border-t border-slate-800/80 pt-2.5">
              <div>
                <span className="text-slate-500 block font-semibold">[추세 및 구조분석]</span>
                <p className="text-slate-300 font-sans">{result.trendAnalysis}</p>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold">[기술 지표 종합의견]</span>
                <p className="text-slate-300 font-sans">{result.indicatorReview}</p>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded border border-emerald-500/10">
                <span className="text-emerald-400 block font-semibold text-[10px] uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  탑 트레이더의 매매 비기 (Master Tips)
                </span>
                <p className="text-slate-200 mt-1 font-sans text-[11px]">{result.masterTradeSecret}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !result && (
          <div className="text-slate-500 text-xs text-center py-10 border border-dashed border-slate-800/80 rounded-lg mt-3 flex flex-col items-center justify-center gap-2">
            <Brain className="w-6 h-6 text-slate-600 animate-bounce" />
            <span>차트를 선택한 후 보고서를 받아보세요.</span>
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 text-center border-t border-slate-800/50 pt-2 font-mono">
        Leveraged with Google DeepMind Intelligence
      </div>
    </div>
  );
}
