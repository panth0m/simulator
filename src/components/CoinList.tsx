import React, { useState, useEffect } from "react";
import { CoinMarket } from "../types";
import { Search, Flame, TrendingUp } from "lucide-react";

interface CoinListProps {
  selectedMarket: string;
  onSelectCoin: (market: CoinMarket) => void;
}

export function CoinList({ selectedMarket, onSelectCoin }: CoinListProps) {
  const [markets, setMarkets] = useState<CoinMarket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarkets() {
      try {
        setLoading(true);
        const res = await fetch("/api/market/all");
        if (!res.ok) throw new Error("코인 목록을 가져오지 못했습니다.");
        const data = await res.json();
        setMarkets(data);
        
        // Auto select BTC if found and nothing selected
        if (data.length > 0 && !selectedMarket) {
          const btc = data.find((m: CoinMarket) => m.market === "KRW-BTC");
          if (btc) onSelectCoin(btc);
          else onSelectCoin(data[0]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load Upbit markets");
      } finally {
        setLoading(false);
      }
    }
    fetchMarkets();
  }, []);

  const filteredMarkets = markets.filter(
    (m) =>
      m.korean_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.market.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.english_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hotCoins = ["KRW-BTC", "KRW-ETH", "KRW-SOL", "KRW-XRP", "KRW-DOGE"];

  return (
    <div id="coin_list_component" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          KRW 마켓 실시간 코인 ({markets.length}개)
        </h3>
        <span className="text-emerald-500 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">
          Upbit Connected
        </span>
      </div>

      {/* Hot Selection Buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {hotCoins.map((ticker) => {
          const coinObj = markets.find((m) => m.market === ticker);
          const active = selectedMarket === ticker;
          return (
            <button
              id={`hot_coin_${ticker}`}
              key={ticker}
              onClick={() => coinObj && onSelectCoin(coinObj)}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-semibold flex items-center gap-1 ${
                active
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
            >
              <Flame className="w-3 h-3 text-orange-400" />
              {ticker.replace("KRW-", "")}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <input
          id="search_coin_input"
          type="text"
          placeholder="코인명 또는 심볼 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-950/80 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
      </div>

      {/* Markets Search List */}
      <div className="overflow-y-auto flex-1 pr-1 space-y-1 max-h-[280px] md:max-h-none scrollbar-thin scrollbar-thumb-slate-800">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 font-mono">Loading dynamic markets...</span>
          </div>
        )}

        {error && (
          <div className="text-[11px] text-rose-400 bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/40 text-center">
            {error}
          </div>
        )}

        {!loading && filteredMarkets.length === 0 && (
          <div className="text-slate-500 text-xs text-center py-10">
            검색 결과에 맞는 코인이 없습니다.
          </div>
        )}

        {!loading &&
          filteredMarkets.map((m) => {
            const isSelected = m.market === selectedMarket;
            const symbol = m.market.replace("KRW-", "");
            return (
              <button
                id={`coin_item_${m.market}`}
                key={m.market}
                onClick={() => onSelectCoin(m)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all group ${
                  isSelected
                    ? "bg-slate-800/80 border border-emerald-500/40"
                    : "hover:bg-slate-800/40 border border-transparent"
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {m.korean_name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    {symbol}
                    <span className="text-[9px] text-slate-600 bg-slate-950 px-1 py-0.2 rounded font-sans uppercase">KRW</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono font-medium text-slate-300">
                    {symbol}/KRW
                  </span>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
