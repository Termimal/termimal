# fetchers/swing_analysis.py
# Evidence-based swing trading analysis engine
# Computes: trend structure, key levels, volume context, momentum, scenarios
# Pure computation from yfinance data — no AI, no signals, no advice

import statistics
import math
import yfinance as yf
import pandas as pd
from datetime import datetime

def _safe(v, decimals=2):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    return round(v, decimals)


def analyze(ticker: str) -> dict:
    print(f"[ANALYSIS] Starting analysis for {ticker}")
    R = {"ticker": ticker, "updated": datetime.utcnow().isoformat() + "Z", "error": None}

    try:
        tk = yf.Ticker(ticker)
        df = tk.history(period="1y", interval="1d", auto_adjust=True)

        if df is None or df.empty or len(df) < 50:
            R["error"] = f"Insufficient data ({len(df) if df is not None else 0} rows)"
            return R

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        closes = df["Close"].dropna().values.tolist()
        highs = df["High"].dropna().values.tolist()
        lows = df["Low"].dropna().values.tolist()
        volumes = df["Volume"].dropna().values.tolist() if "Volume" in df.columns else []
        n = len(closes)
        price = closes[-1]

        R["price"] = _safe(price, 4)
        R["n_days"] = n

        # ══════════════════════════════════════════════════════
        # 1. TREND STRUCTURE
        # ══════════════════════════════════════════════════════
        sma50 = statistics.mean(closes[-50:]) if n >= 50 else None
        sma200 = statistics.mean(closes[-200:]) if n >= 200 else None
        sma20 = statistics.mean(closes[-20:]) if n >= 20 else None

        # Higher highs / higher lows detection (last 60 days, 3 swing points)
        def find_swings(data, window=10):
            swing_highs, swing_lows = [], []
            for i in range(window, len(data) - window):
                if data[i] == max(data[i-window:i+window+1]):
                    swing_highs.append((i, data[i]))
                if data[i] == min(data[i-window:i+window+1]):
                    swing_lows.append((i, data[i]))
            return swing_highs[-4:], swing_lows[-4:]

        swing_h, swing_l = find_swings(closes[-90:] if n >= 90 else closes)

        hh = len(swing_h) >= 2 and all(swing_h[i+1][1] > swing_h[i][1] for i in range(len(swing_h)-1))
        hl = len(swing_l) >= 2 and all(swing_l[i+1][1] > swing_l[i][1] for i in range(len(swing_l)-1))
        lh = len(swing_h) >= 2 and all(swing_h[i+1][1] < swing_h[i][1] for i in range(len(swing_h)-1))
        ll = len(swing_l) >= 2 and all(swing_l[i+1][1] < swing_l[i][1] for i in range(len(swing_l)-1))

        if hh and hl:
            structure = "Uptrend"
            structure_detail = "Higher highs and higher lows — bullish structure intact"
        elif lh and ll:
            structure = "Downtrend"
            structure_detail = "Lower highs and lower lows — bearish structure intact"
        else:
            structure = "Range-bound"
            structure_detail = "No clear directional structure — consolidation or transition"

        # SMA positioning
        sma_context = []
        if sma50:
            if price > sma50:
                sma_context.append("Price above 50d SMA — short-term bullish")
            else:
                sma_context.append("Price below 50d SMA — short-term bearish")
        if sma200:
            if price > sma200:
                sma_context.append("Price above 200d SMA — long-term bullish")
            else:
                sma_context.append("Price below 200d SMA — long-term bearish")
        if sma50 and sma200:
            if sma50 > sma200:
                sma_context.append("Golden cross active (50d > 200d)")
            else:
                sma_context.append("Death cross active (50d < 200d)")

        # Trend score: -2 to +2
        trend_score = 0
        if hh and hl: trend_score += 1
        elif lh and ll: trend_score -= 1
        if sma50 and price > sma50: trend_score += 0.5
        elif sma50: trend_score -= 0.5
        if sma200 and price > sma200: trend_score += 0.5
        elif sma200: trend_score -= 0.5

        trend_bias = "Bullish" if trend_score > 0.5 else "Bearish" if trend_score < -0.5 else "Neutral"

        R["trend"] = {
            "structure": structure,
            "detail": structure_detail,
            "bias": trend_bias,
            "score": _safe(trend_score, 1),
            "sma_context": sma_context,
            "sma20": _safe(sma20),
            "sma50": _safe(sma50),
            "sma200": _safe(sma200),
            "price_vs_50": _safe((price / sma50 - 1) * 100, 1) if sma50 else None,
            "price_vs_200": _safe((price / sma200 - 1) * 100, 1) if sma200 else None,
        }

        # ══════════════════════════════════════════════════════
        # 2. KEY LEVELS
        # ══════════════════════════════════════════════════════
        # Find price levels where market reacted multiple times (clusters)
        all_reaction_points = []
        for i in range(5, min(n, 180)):  # Last 6 months
            idx = n - i
            if idx >= 1 and idx < n - 1:
                # Swing high
                if highs[idx] >= highs[idx-1] and highs[idx] >= highs[idx+1]:
                    all_reaction_points.append(highs[idx])
                # Swing low
                if lows[idx] <= lows[idx-1] and lows[idx] <= lows[idx+1]:
                    all_reaction_points.append(lows[idx])

        # Cluster nearby levels
        levels = []
        if all_reaction_points:
            sorted_pts = sorted(all_reaction_points)
            cluster_threshold = price * 0.015  # 1.5% clustering
            clusters = []
            current_cluster = [sorted_pts[0]]
            for pt in sorted_pts[1:]:
                if pt - current_cluster[-1] < cluster_threshold:
                    current_cluster.append(pt)
                else:
                    if len(current_cluster) >= 2:  # At least 2 touches
                        clusters.append(current_cluster)
                    current_cluster = [pt]
            if len(current_cluster) >= 2:
                clusters.append(current_cluster)

            for cl in clusters:
                level = statistics.mean(cl)
                touches = len(cl)
                dist = _safe((price - level) / level * 100, 1)
                role = "Support" if level < price else "Resistance"
                levels.append({
                    "price": _safe(level),
                    "touches": touches,
                    "distance_pct": dist,
                    "role": role,
                })
            levels.sort(key=lambda x: abs(x["distance_pct"]))
            levels = levels[:6]  # Top 6 most relevant

        R["levels"] = levels

        # ══════════════════════════════════════════════════════
        # 3. VOLUME CONTEXT
        # ══════════════════════════════════════════════════════
        if len(volumes) >= 30:
            avg_vol_20 = statistics.mean(volumes[-20:])
            avg_vol_50 = statistics.mean(volumes[-50:]) if len(volumes) >= 50 else avg_vol_20
            recent_vol = volumes[-1]
            vol_ratio = recent_vol / avg_vol_20 if avg_vol_20 > 0 else 1
            vol_trend = (avg_vol_20 - avg_vol_50) / avg_vol_50 * 100 if avg_vol_50 > 0 else 0

            # Price direction last 5 days
            price_5d_chg = (closes[-1] - closes[-6]) / closes[-6] * 100 if n > 6 else 0

            if vol_ratio > 1.5 and price_5d_chg > 0:
                vol_interp = "Strong buying pressure — price up on high volume. Genuine demand."
            elif vol_ratio > 1.5 and price_5d_chg < 0:
                vol_interp = "Heavy selling pressure — price down on high volume. Distribution likely."
            elif vol_ratio < 0.7 and abs(price_5d_chg) > 2:
                vol_interp = "Price moving on low volume — suspect move, likely to fade."
            elif vol_ratio < 0.7:
                vol_interp = "Low participation — market lacks conviction in either direction."
            else:
                vol_interp = "Volume within normal range — no unusual activity detected."

            R["volume"] = {
                "current": int(recent_vol),
                "avg_20d": int(avg_vol_20),
                "ratio": _safe(vol_ratio, 2),
                "trend_pct": _safe(vol_trend, 1),
                "interpretation": vol_interp,
                "price_5d_chg": _safe(price_5d_chg, 1),
            }
        else:
            R["volume"] = {"interpretation": "Insufficient volume data"}

        # ══════════════════════════════════════════════════════
        # 4. MOMENTUM (RSI)
        # ══════════════════════════════════════════════════════
        def compute_rsi(data, period=14):
            if len(data) < period + 1:
                return None, []
            gains, losses = [], []
            for i in range(1, len(data)):
                chg = data[i] - data[i-1]
                gains.append(max(0, chg))
                losses.append(max(0, -chg))
            
            rsi_series = []
            avg_gain = statistics.mean(gains[:period])
            avg_loss = statistics.mean(losses[:period])
            
            for i in range(period, len(gains)):
                avg_gain = (avg_gain * (period - 1) + gains[i]) / period
                avg_loss = (avg_loss * (period - 1) + losses[i]) / period
                rs = avg_gain / avg_loss if avg_loss > 0 else 100
                rsi_series.append(round(100 - 100 / (1 + rs), 1))
            
            return rsi_series[-1] if rsi_series else None, rsi_series

        rsi_val, rsi_hist = compute_rsi(closes)
        rsi_5d_ago = rsi_hist[-6] if len(rsi_hist) >= 6 else None

        if rsi_val is not None:
            # Momentum direction
            if rsi_5d_ago:
                mom_dir = "increasing" if rsi_val > rsi_5d_ago else "decreasing"
            else:
                mom_dir = "unknown"

            # Zone
            if rsi_val > 70:
                rsi_zone = "Overbought"
                rsi_interp = f"RSI at {rsi_val:.0f} — overbought territory. Momentum is {mom_dir}. "
                if structure == "Uptrend":
                    rsi_interp += "In an uptrend, overbought can persist. Watch for RSI divergence as warning."
                else:
                    rsi_interp += "Outside an uptrend, overbought RSI increases probability of mean reversion."
            elif rsi_val < 30:
                rsi_zone = "Oversold"
                rsi_interp = f"RSI at {rsi_val:.0f} — oversold territory. Momentum is {mom_dir}. "
                if structure == "Downtrend":
                    rsi_interp += "In a downtrend, oversold can persist. Not a buy signal alone."
                else:
                    rsi_interp += "Outside a downtrend, oversold RSI increases probability of a bounce."
            elif rsi_val > 55:
                rsi_zone = "Bullish"
                rsi_interp = f"RSI at {rsi_val:.0f} — bullish zone. Momentum is {mom_dir}."
            elif rsi_val < 45:
                rsi_zone = "Bearish"
                rsi_interp = f"RSI at {rsi_val:.0f} — bearish zone. Momentum is {mom_dir}."
            else:
                rsi_zone = "Neutral"
                rsi_interp = f"RSI at {rsi_val:.0f} — neutral. No strong momentum signal."

            # Price-RSI divergence
            divergence = None
            if len(rsi_hist) >= 20 and n >= 20:
                price_trend = closes[-1] > closes[-20]
                rsi_trend = rsi_hist[-1] > rsi_hist[-20] if len(rsi_hist) >= 20 else None
                if rsi_trend is not None:
                    if price_trend and not rsi_trend:
                        divergence = "Bearish divergence — price making highs but RSI declining. Momentum weakening."
                    elif not price_trend and rsi_trend:
                        divergence = "Bullish divergence — price making lows but RSI rising. Selling pressure may be exhausting."

            R["momentum"] = {
                "rsi": _safe(rsi_val, 1),
                "rsi_5d_ago": _safe(rsi_5d_ago, 1),
                "zone": rsi_zone,
                "direction": mom_dir,
                "interpretation": rsi_interp,
                "divergence": divergence,
                "history": rsi_hist[-90:],
            }
        else:
            R["momentum"] = {"interpretation": "Insufficient data for RSI calculation"}

        # ══════════════════════════════════════════════════════
        # 5. VOLATILITY CONTEXT
        # ══════════════════════════════════════════════════════
        if n >= 30:
            returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(max(1, n-30), n)]
            vol_30d = statistics.stdev(returns) * math.sqrt(252) * 100
            atr_vals = [highs[i] - lows[i] for i in range(max(0, n-14), n)]
            atr = statistics.mean(atr_vals) if atr_vals else 0
            atr_pct = (atr / price * 100) if price > 0 else 0

            R["volatility"] = {
                "annualized_30d": _safe(vol_30d, 1),
                "atr_14": _safe(atr, 4),
                "atr_pct": _safe(atr_pct, 2),
                "regime": "Low" if vol_30d < 20 else "Normal" if vol_30d < 40 else "Elevated" if vol_30d < 70 else "Extreme",
            }

        # ══════════════════════════════════════════════════════
        # 6. SCENARIO SUMMARY
        # ══════════════════════════════════════════════════════
        # Find nearest support and resistance
        supports = sorted([l for l in levels if l["role"] == "Support"], key=lambda x: abs(x["distance_pct"]))
        resistances = sorted([l for l in levels if l["role"] == "Resistance"], key=lambda x: abs(x["distance_pct"]))

        nearest_support = supports[0]["price"] if supports else (price * 0.95)
        nearest_resistance = resistances[0]["price"] if resistances else (price * 1.05)
        second_support = supports[1]["price"] if len(supports) > 1 else (price * 0.90)
        second_resistance = resistances[1]["price"] if len(resistances) > 1 else (price * 1.10)

        # Bull case
        bull_conditions = []
        if structure == "Uptrend":
            bull_conditions.append("Trend structure supports continuation")
        else:
            bull_conditions.append(f"Needs to establish higher highs above {_safe(nearest_resistance)}")
        if sma50 and price > sma50:
            bull_conditions.append("Holding above 50d SMA")
        elif sma50:
            bull_conditions.append(f"Needs to reclaim 50d SMA at {_safe(sma50)}")
        if rsi_val and rsi_val < 30:
            bull_conditions.append("Oversold RSI supports bounce probability")
        if R.get("volume", {}).get("ratio", 1) > 1.3 and R.get("volume", {}).get("price_5d_chg", 0) > 0:
            bull_conditions.append("Recent buying volume confirms demand")

        # Bear case
        bear_conditions = []
        if structure == "Downtrend":
            bear_conditions.append("Trend structure supports continuation lower")
        else:
            bear_conditions.append(f"Break below {_safe(nearest_support)} would shift structure bearish")
        if sma50 and price < sma50:
            bear_conditions.append("Trading below 50d SMA — sellers in control")
        if rsi_val and rsi_val > 70:
            bear_conditions.append("Overbought RSI increases reversion risk")
        if R.get("momentum", {}).get("divergence") and "Bearish" in R.get("momentum", {}).get("divergence", ""):
            bear_conditions.append("RSI divergence signals weakening momentum")

        R["scenarios"] = {
            "bull": {
                "target": _safe(nearest_resistance),
                "extended_target": _safe(second_resistance),
                "invalidation": _safe(nearest_support),
                "conditions": bull_conditions,
                "probability": "Higher" if trend_score > 0.5 else "Moderate" if trend_score >= 0 else "Lower",
            },
            "bear": {
                "target": _safe(nearest_support),
                "extended_target": _safe(second_support),
                "invalidation": _safe(nearest_resistance),
                "conditions": bear_conditions,
                "probability": "Higher" if trend_score < -0.5 else "Moderate" if trend_score <= 0 else "Lower",
            },
        }

        # ══════════════════════════════════════════════════════
        # PRICE DATA FOR CHART
        # ══════════════════════════════════════════════════════
        R["chart_data"] = {
            "closes": [_safe(c, 4) for c in closes[-90:]],
            "highs": [_safe(h, 4) for h in highs[-90:]],
            "lows": [_safe(l, 4) for l in lows[-90:]],
            "volumes": volumes[-90:] if volumes else [],
            "sma20": [_safe(statistics.mean(closes[max(0,i-19):i+1]), 4) for i in range(max(0,n-90), n)] if n >= 20 else [],
            "sma50": [_safe(statistics.mean(closes[max(0,i-49):i+1]), 4) for i in range(max(0,n-90), n)] if n >= 50 else [],
            "rsi": rsi_hist[-90:] if rsi_hist else [],
        }

        print(f"[ANALYSIS] Done: {ticker} — {structure} — RSI {rsi_val} — Trend score {trend_score}")
        return R

    except Exception as e:
        print(f"[ANALYSIS] Error for {ticker}: {e}")
        import traceback; traceback.print_exc()
        R["error"] = str(e)
        return R
