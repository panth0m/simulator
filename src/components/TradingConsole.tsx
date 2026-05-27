import React, { useState } from "react";
import { WalletState, CoinMarket, Position, TradeHistory } from "../types";
import { CircleDollarSign, History, Trash2, ArrowUpRight, ArrowDownLeft, RotateCcw } from "lucide-react";

interface TradingConsoleProps {
  wallet: WalletState;
  selectedCoin: CoinMarket;
  currentPrice: number;
  trades: TradeHistory[];
  onExecuteTrade: (type: "BUY" | "SELL", amountKrw: number, currentPrice: number, strategy: string) => void;
  onSellPosition: (market: string) => void;
  onResetPortfolio: () => void;
}

export function TradingConsole({
  wallet,
  selectedCoin,
  currentPrice,
  trades,
  onExecuteTrade,
  onSellPosition,
  onResetPortfolio,
}: TradingConsoleProps) {
  const [orderAmountStr, setOrderAmountStr] = useState("1000000"); // preset 1,000,000 KRW
  const isHolding = !!wallet.positions[selectedCoin.market];
  const holdingPosition = wallet.positions[selectedCoin.market];

  // Calculations for display
  const totalPositionValue = Object.values(wallet.positions).reduce(
    (acc, pos) => acc + pos.amount * currentPrice, // standard approximation or detailed pricing
    0
  );
  // Wait, the positions might be in other coins too. To calculate total value properly:
  // In a sandbox, let's value each position using its own entry or current approximation.
  const valuation = wallet.cash + Object.values(wallet.positions).reduce(
    (acc, pos) => acc + pos.amount * pos.currentPrice,
    0
  );

  const profitPercent = ((valuation - wallet.initialCash) / wallet.initialCash) * 100;

  const handleQuickPercent = (percent: number) => {
    const rawVal = Math.floor(wallet.cash * percent);
    setOrderAmountStr(rawVal.toString());
  };

  const executeManualTrade = (type: "BUY" | "SELL") => {
    const amt = parseFloat(orderAmountStr);
    if (isNaN(amt) || amt <= 0) return;
    onExecuteTrade(type, amt, currentPrice, "Manual Pro Trader");
  };

  return (
    <div id="trading_console_component" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full space-y-4">
      {/* Simulation Wealth Board */}
      <div>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <h4 className="text-white font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wide">
            <CircleDollarSign className="w-4 h-4 text-emerald-500" />
            모의 소장 지갑 (Sandbox Crypto Wallet)
          </h4>
          <button
            id="reset_portfolio_btn"
            onClick={onResetPortfolio}
            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
            title="지갑 리셋"
          >
            <RotateCcw className="w-3 h-3" />
            초기화
          </button>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-slate-500">총 평가 자산 (Total Wealth)</div>
            <div className="text-sm font-bold text-white font-mono mt-0.5">
              {valuation.toLocaleString(undefined, { maximumFractionDigits: 0 })} KRW
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500">가용 현금 (Available Cash)</div>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
              {wallet.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })} KRW
            </div>
          </div>
          <div className="col-span-2 pt-2 border-t border-slate-900/60 flex justify-between items-center text-[11px] font-mono">
            <span className="text-slate-500">누적 수익률 (Cumulative ROI)</span>
            <span
              className={`font-semibold shrink-0 ${
                profitPercent >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {profitPercent >= 0 ? "+" : ""}
              {profitPercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Manual order workstation */}
      <div className="space-y-2.5">
        <label className="text-[10px] text-slate-400 font-medium block">
          신속 매수/매도 주문 주입 ({selectedCoin.korean_name} 기한)
        </label>
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 spacer-y-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
            <span>실시간 현재가 :</span>
            <span className="text-white font-semibold">{currentPrice.toLocaleString()} ₩</span>
          </div>

          <div className="flex gap-2">
            <input
              id="order_amount_input"
              type="number"
              placeholder="주문 금액 입력 (KRW)"
              value={orderAmountStr}
              onChange={(e) => setOrderAmountStr(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white text-right font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="text-slate-500 text-[10px] self-center">KRW</span>
          </div>

          {/* Quick rations selection */}
          <div className="flex gap-1 mt-2.5">
            <button
              id="ratio_25_btn"
              onClick={() => handleQuickPercent(0.25)}
              className="flex-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-1 rounded font-mono transition-colors"
            >
              25%
            </button>
            <button
              id="ratio_50_btn"
              onClick={() => handleQuickPercent(0.5)}
              className="flex-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-1 rounded font-mono transition-colors"
            >
              50%
            </button>
            <button
              id="ratio_100_btn"
              onClick={() => handleQuickPercent(1)}
              className="flex-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-1 rounded font-mono transition-colors"
            >
              100%
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              id="execute_manual_buy_btn"
              onClick={() => executeManualTrade("BUY")}
              className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition-colors flex items-center justify-center gap-1 shadow-md cursor-pointer active:scale-[0.98]"
            >
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
              지정가 매수
            </button>
            <button
              id="execute_manual_sell_btn"
              onClick={() => executeManualTrade("SELL")}
              className="py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black rounded-lg text-xs transition-colors flex items-center justify-center gap-1 shadow-md cursor-pointer active:scale-[0.98]"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[3]" />
              전량 매도
            </button>
          </div>
        </div>
      </div>

      {/* Position holdings list */}
      <div className="space-y-2">
        <span className="text-[10px] text-slate-400 font-medium block">
          현재 보유 포지션 (Active Position Holdings)
        </span>
        <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg max-h-[140px] overflow-y-auto pr-1">
          {Object.keys(wallet.positions).length === 0 ? (
            <p className="text-slate-500 text-center py-6 text-[11px]">대기 중인 보지션 홀딩이 없습니다.</p>
          ) : (
            Object.values(wallet.positions).map((pos) => {
              const symbol = pos.market.replace("KRW-", "");
              const currentVal = pos.amount * currentPrice; // approximate valuation
              const costVal = pos.amount * pos.averagePrice;
              const pNLPercent = ((pos.currentPrice - pos.averagePrice) / pos.averagePrice) * 100;
              return (
                <div
                  id={`holding_card_${pos.market}`}
                  key={pos.market}
                  className="p-2 border-b border-slate-800/60 last:border-0 flex justify-between items-center text-xs text-slate-300"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{pos.coinName}</span>
                      <span className="text-[9px] text-slate-400 font-mono font-normal">({symbol})</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {pos.amount.toFixed(4)} {symbol}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div className="font-mono">
                      <div className="text-[11px] font-semibold text-white">
                        {(pos.amount * pos.currentPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₩
                      </div>
                      <div
                        className={`text-[9px] font-bold ${
                          pNLPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {pNLPercent >= 0 ? "+" : ""}
                        {pNLPercent.toFixed(2)}%
                      </div>
                    </div>
                    <button
                      id={`sell_holding_${pos.market}`}
                      onClick={() => onSellPosition(pos.market)}
                      className="text-[9px] text-slate-950 bg-rose-400 hover:bg-rose-300 px-1.5 py-1 rounded font-bold transition-colors shadow-sm cursor-pointer"
                    >
                      매각
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Instant historic receipts log list */}
      <div className="space-y-2 flex-1 flex flex-col justify-end">
        <span className="text-[10px] text-slate-400 font-medium block flex items-center gap-1">
          <History className="w-3.5 h-3.5 text-slate-400" />
          과거 매매 기록 체결 창 (Instant Fills Ledger)
        </span>
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg max-h-[160px] overflow-y-auto text-[11px] font-mono pr-1 flex-1">
          {trades.length === 0 ? (
            <p className="text-slate-500 text-center py-10 text-[11px]">로컬 체결 주문 기록이 없습니다.</p>
          ) : (
            [...trades].reverse().map((t, idx) => (
              <div
                id={`trade_log_${t.id}`}
                key={t.id}
                className="p-2 border-b border-slate-800/40 last:border-0 flex items-center justify-between text-slate-300 hover:bg-slate-900/40 transition-all"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                        t.type === "BUY"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      {t.type}
                    </span>
                    <span className="font-semibold text-white">{t.coinName} ({t.market.replace("KRW-", "")})</span>
                  </div>
                  <span className="text-[9px] text-slate-500">{t.strategy}</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-semibold">
                    {t.price.toLocaleString()} ₩
                  </span>
                  <div className="text-[9px] text-slate-500">
                    {t.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₩
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
