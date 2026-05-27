import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper for lazy API client initialization (Good pattern: fails gracefully on first use rather than crashing dev server)
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please set it in your environment settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ==========================================
// UPBIT PUBLIC API PROXIES (Bypasses CORS restrictions)
// ==========================================

// 1. Get all markets
app.get("/api/market/all", async (req, res) => {
  try {
    const response = await fetch("https://api.upbit.com/v1/market/all?isDetails=false");
    if (!response.ok) {
      throw new Error(`Upbit API responded with status ${response.status}`);
    }
    const data = await response.json();
    // Filter to only KRW markets as requested by the user
    const krwMarkets = data.filter((m: any) => m.market.startsWith("KRW-"));
    res.json(krwMarkets);
  } catch (error: any) {
    console.error("Error proxying markets:", error);
    res.status(500).json({ error: error.message || "Failed to fetch markets" });
  }
});

// 2. Get minute candles
app.get("/api/candles/minutes/:unit", async (req, res) => {
  const { unit } = req.params;
  const { market, to, count } = req.query;
  try {
    let url = `https://api.upbit.com/v1/candles/minutes/${unit}?market=${market}&count=${count || 50}`;
    if (to) {
      url += `&to=${to}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Upbit API responded with status ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Error proxying minute candles:", error);
    res.status(500).json({ error: error.message || "Failed to fetch minute candles" });
  }
});

// 3. Get daily candles
app.get("/api/candles/days", async (req, res) => {
  const { market, to, count } = req.query;
  try {
    let url = `https://api.upbit.com/v1/candles/days?market=${market}&count=${count || 50}`;
    if (to) {
      url += `&to=${to}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Upbit API responded with status ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Error proxying daily candles:", error);
    res.status(500).json({ error: error.message || "Failed to fetch daily candles" });
  }
});

// ==========================================
// GEMINI TRADING STRATEGY NARRATIVE & DECISION ENGINE
// ==========================================
app.post("/api/trading/analyze", async (req, res) => {
  const { coinSymbol, coinName, candles, indicators } = req.body;

  try {
    const ai = getGenAI();

    // Limit candle detail size to prevent excessive token use
    const formattedCandles = candles.slice(0, 15).map((c: any) => ({
      time: c.candle_date_time_kst || c.time,
      open: c.opening_price,
      high: c.high_price,
      low: c.low_price,
      close: c.trade_price,
      volume: c.candle_acc_trade_volume,
    }));

    const systemPrompt = `You are a legendary cryptocurrency top trader with 15+ years of experience and a 92% win rate. 
Your goal is to inspect the recent OHLCV market chart data, key technical indicators, and provide detailed strategy recommendations.
Your responses must be returned as a clean, highly structured JSON matching the requested schema. Make sure you are bold, realistic, analytical, and cut straight to the truth. Limit narrative answers to Korean language so the user can easily comprehend.`;

    const userPrompt = `
Analyze the crypto asset: ${coinName} (${coinSymbol})
Here are the recent ${formattedCandles.length} Japanese candlestick periods (newest to oldest):
${JSON.stringify(formattedCandles, null, 2)}

Current mechanical indicator variables calculated as follows:
- Current RSI (14): ${indicators.rsi.toFixed(2)}
- EMA(20) Current: ${indicators.ema20.toFixed(2)} KRW
- EMA(50) Current: ${indicators.ema50.toFixed(2)} KRW
- Bollinger Bands (20, 2): Upper=${indicators.bbUpper.toFixed(2)}, Middle=${indicators.bbMiddle.toFixed(2)}, Lower=${indicators.bbLower.toFixed(2)}
- 24-Hour Price Change: ${indicators.priceChangePercent.toFixed(2)}%

Act like a master trader. Inspect volume spikes, RSI oversold/overbought thresholds, EMA crossovers, support zones, and candle exhaustion. Provide your trade recommendation: BUY, SELL, or HOLD. Provide your rationale, set a strict Target Profit price (KRW), and Stop Loss price (KRW).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["recommendation", "confidence", "targetPrice", "stopLoss", "trendAnalysis", "indicatorReview", "masterTradeSecret"],
          properties: {
            recommendation: {
              type: Type.STRING,
              description: "The recommendation: must be exactly 'BUY', 'SELL', or 'HOLD'.",
            },
            confidence: {
              type: Type.INTEGER,
              description: "Confidence value between 0 and 100 representing probability of success.",
            },
            targetPrice: {
              type: Type.NUMBER,
              description: "Optimal target exit profit price in KRW based on resistance lines.",
            },
            stopLoss: {
              type: Type.NUMBER,
              description: "Strict risk stop-loss price in KRW based on key support lines.",
            },
            trendAnalysis: {
              type: Type.STRING,
              description: "1-2 sentences in Korean analyzing the macro trend (bullish, bearish, sideways) and current market structure.",
            },
            indicatorReview: {
              type: Type.STRING,
              description: "1-2 sentences in Korean explaining what the RSI, MACD/EMA, and Bollinger Bands say about current momentum.",
            },
            masterTradeSecret: {
              type: Type.STRING,
              description: "An exclusive, high-level pro-tip in Korean explaining why this setup is prime or risky, referencing volume or candle patterns.",
            },
          },
        },
      },
    });

    const parsedResponse = JSON.parse(response.text?.trim() || "{}");
    res.json(parsedResponse);
  } catch (error: any) {
    console.error("Gemini Market Analysis Error:", error);
    // Fallback response if GEMINI_API_KEY is not set or fails, so the app remains safe & usable
    let errorMsg = error.message || "Failed to contact Gemini strategy advisor";
    res.status(200).json({
      fallback: true,
      recommendation: "HOLD",
      confidence: 50,
      targetPrice: req.body.candles[0]?.trade_price * 1.05 || 0,
      stopLoss: req.body.candles[0]?.trade_price * 0.95 || 0,
      trendAnalysis: `비정상적인 접속이 발생했거나 점검 중입니다: ${errorMsg}`,
      indicatorReview: "기술적 지표가 중립 영역에 머물러 있습니다. 안정을 기하는 것이 좋습니다.",
      masterTradeSecret: "API 키 설정 상태를 확인하시거나 임시로 안전 매매 비중을 도입하세요. 리스크 관리가 최우선입니다.",
    });
  }
});

// ==========================================
// VITE OR STATIC FILE ENGINE SETUP
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULL-STACK ENGINE] Upbit AI Trading system running on http://localhost:${PORT}`);
  });
}

startServer();
