# fetchers/btc_onchain.py
# Bitcoin valuation & on-chain metrics — ALL computed from yfinance
# Puell Multiple estimated from known block reward schedule × price
# No external APIs, no keys

import statistics, math
import yfinance as yf
import pandas as pd
from datetime import datetime, date

BTC_SUPPLY = 19_850_000
BLOCKS_PER_DAY = 144  # ~10 min per block

# Block reward halving schedule (date, reward per block in BTC)
HALVINGS = [
    (date(2012, 11, 28), 25.0),
    (date(2016, 7, 9),   12.5),
    (date(2020, 5, 11),  6.25),
    (date(2024, 4, 20),  3.125),
]

def _block_reward(d):
    """BTC block reward at a given date."""
    reward = 50.0  # original
    for hd, hr in HALVINGS:
        if d >= hd:
            reward = hr
    return reward

def _band_mvrv(v):
    if v < 1.0: return "Depressed", "Market valued below what holders paid on average"
    if v < 2.5: return "Fair", "Market valued within normal historical range"
    if v < 3.2: return "Elevated", "Market valued above average — historically stretched"
    return "Overheated", "Market valued far above what holders paid — historically extreme"

def _band_z(v):
    if v < 0: return "Depressed", "Negative Z-score — market cap below its moving average cost basis"
    if v < 3: return "Fair", "Z-score in normal range"
    if v < 7: return "Elevated", "Z-score above average — market heating up"
    return "Overheated", "Z-score at historically extreme levels"

def _band_puell(v):
    if v < 0.5: return "Deep Stress", "Miners earning far less than their yearly average — often near cycle bottoms"
    if v < 1.0: return "Stressed", "Miners earning below their yearly average"
    if v < 4.0: return "Normal", "Miner revenue within expected range"
    return "Overheated", "Miners earning far above average — often near cycle peaks"

def _band_sma(v, period):
    if v < 0.8: return "Depressed", f"Price well below its {period} average — historically cheap zone"
    if v < 1.0: return "Fair", f"Price slightly below {period} average"
    if v < 1.2: return "Fair", f"Price near {period} average — neutral territory"
    if v < 1.8: return "Elevated", f"Price above {period} average — historically stretched"
    return "Overheated", f"Price far above {period} average — historically extreme"

def _unavailable(name, formula, reason):
    return {"name": name, "value": None, "state": None, "interpretation": reason,
            "formula": formula, "source": "Requires blockchain node", "history": None,
            "what": f"{name} cannot be computed from price data alone. It requires direct blockchain node access."}


def fetch_btc_onchain():
    print("[BTC ON-CHAIN] Starting — 5y daily from yfinance...")
    now = datetime.utcnow().isoformat() + "Z"
    R = {"ticker": "BTC-USD", "updated": now, "sections": {}, "error": None, "price_history": None}

    try:
        tk = yf.Ticker("BTC-USD")
        df = tk.history(period="5y", interval="1d", auto_adjust=True)
        print(f"[BTC ON-CHAIN] Got {len(df)} rows")

        if df is None or df.empty or len(df) < 60:
            R["error"] = f"Insufficient history ({len(df) if df is not None else 0} rows)"
            return R

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        closes = df["Close"].dropna().values.tolist()
        volumes = df["Volume"].dropna().values.tolist() if "Volume" in df.columns else []
        dates = [d.date() if hasattr(d, 'date') else d for d in df.index.tolist()]
        n = len(closes)
        price = closes[-1]
        mcap = price * BTC_SUPPLY
        src = "yfinance"

        # Send price history for dual-axis charts
        R["price_history"] = [round(c, 2) for c in closes]
        R["price_dates"] = [d.isoformat() if hasattr(d, 'isoformat') else str(d) for d in dates[:len(closes)]]

        # Volume unit detection
        avg_vol = statistics.mean(volumes[-30:]) if len(volumes) >= 30 else 0
        vol_is_usd = avg_vol > 1_000_000
        print(f"[BTC ON-CHAIN] Price=${price:,.0f} n={n} vol_usd={vol_is_usd}")

        mcaps = [c * BTC_SUPPLY for c in closes]
        w200 = min(200, n)
        rc_est = statistics.mean(mcaps[-w200:])
        realized_price = rc_est / BTC_SUPPLY

        # ── Helper: full rolling computation ──
        def rolling(fn, window):
            h = []
            for idx in range(window, n):
                h.append(round(fn(idx, window), 4))
            return h

        def mvrv_fn(idx, w):
            rc = statistics.mean(mcaps[idx-w:idx])
            return mcaps[idx] / rc if rc > 0 else 1

        def z_fn(idx, w):
            rc = statistics.mean(mcaps[idx-w:idx])
            sd = statistics.stdev(mcaps[:idx+1]) if idx > 30 else 1
            return (mcaps[idx] - rc) / sd if sd > 0 else 0

        def sma_fn(period):
            def fn(idx, _w):
                s = statistics.mean(closes[idx-period:idx])
                return closes[idx] / s if s > 0 else 1
            return fn

        # ══════════════════════════════════════════════════════
        # SECTION 1: VALUATION
        # ══════════════════════════════════════════════════════
        V = []

        # MVRV
        mvrv = round(mcap / rc_est, 4) if rc_est > 0 else None
        if mvrv is not None:
            st, ip = _band_mvrv(mvrv)
            V.append({"name": "MVRV", "value": mvrv, "state": st, "interpretation": ip,
                       "formula": "Market Cap ÷ Realized Cap (200d average cost basis)",
                       "source": src, "history": rolling(mvrv_fn, 200), "hist_offset": 200,
                       "bands": [{"min":0,"max":1.0,"label":"Depressed","color":"depressed"},
                                 {"min":1.0,"max":2.5,"label":"Fair","color":"neutral"},
                                 {"min":2.5,"max":3.2,"label":"Elevated","color":"elevated"},
                                 {"min":3.2,"max":8,"label":"Overheated","color":"overheated"}],
                       "default_tf": "max",
                       "what": "MVRV compares what Bitcoin is worth now vs what everyone paid for it on average. Below 1.0 = market is cheaper than what people paid. Above 3.0 = historically expensive."})

        # MVRV-Z
        sd_all = statistics.stdev(mcaps) if n > 30 else 1
        if sd_all > 0 and rc_est > 0:
            z = round((mcap - rc_est) / sd_all, 4)
            st, ip = _band_z(z)
            V.append({"name": "MVRV-Z Score", "value": z, "state": st, "interpretation": ip,
                       "formula": "(Market Cap − Realized Cap) ÷ standard deviation",
                       "source": src, "history": rolling(z_fn, 200), "hist_offset": 200,
                       "bands": [{"min":-5,"max":0,"label":"Depressed","color":"depressed"},
                                 {"min":0,"max":3,"label":"Fair","color":"neutral"},
                                 {"min":3,"max":7,"label":"Elevated","color":"elevated"},
                                 {"min":7,"max":12,"label":"Overheated","color":"overheated"}],
                       "default_tf": "max",
                       "what": "MVRV-Z normalizes MVRV using standard deviation. Negative = very cheap historically. Above 7 = historically always preceded major corrections."})

        # Realized Cap + Price
        V.append({"name": "Realized Cap", "value": round(rc_est/1e9, 1), "unit": "$B",
                   "state": None, "interpretation": "Estimated total cost basis of all BTC holders",
                   "formula": "200d moving average of Market Cap", "source": src, "history": None,
                   "what": "Realized Cap estimates how much money people actually put into Bitcoin. Think of it as the 'break-even' price for the average holder."})

        V.append({"name": "Market Cap", "value": round(mcap/1e9, 1), "unit": "$B",
                   "state": None, "interpretation": f"Current total value of all Bitcoin",
                   "formula": f"Price (${price:,.0f}) × Supply ({BTC_SUPPLY:,})", "source": src, "history": None,
                   "what": "Market Cap = price × number of coins. It tells you the total value the market assigns to Bitcoin right now."})

        V.append({"name": "Realized Price", "value": round(realized_price, 0), "unit": "$",
                   "state": "Depressed" if price < realized_price else "Fair",
                   "interpretation": f"Average cost basis ${realized_price:,.0f} vs current ${price:,.0f}",
                   "formula": "Realized Cap ÷ Supply", "source": src, "history": None,
                   "what": f"Realized Price is the 'average buy price' of all holders. Currently ${realized_price:,.0f}. If BTC trades below this, most holders are at a loss."})

        # Price vs Realized
        if realized_price > 0:
            pvr = round(price / realized_price, 4)
            V.append({"name": "Price / Realized", "value": pvr,
                       "state": "Depressed" if pvr < 1 else "Fair" if pvr < 1.5 else "Elevated",
                       "interpretation": f"{'Below' if pvr<1 else 'Above'} average holder cost basis",
                       "formula": f"${price:,.0f} ÷ ${realized_price:,.0f}", "source": src, "history": None,
                       "what": "If this is below 1.0, Bitcoin is trading below what the average person paid — historically a rare and significant moment."})

        # Price vs 200D SMA
        if n >= 200:
            sma200 = statistics.mean(closes[-200:])
            r200 = round(price / sma200, 4)
            st, ip = _band_sma(r200, "200-day")
            V.append({"name": "Price / 200d", "value": r200, "state": st, "interpretation": ip,
                       "formula": f"${price:,.0f} ÷ ${sma200:,.0f}", "source": src,
                       "history": rolling(sma_fn(200), 200), "hist_offset": 200,
                       "bands": [{"min":0,"max":0.8,"label":"Below trend","color":"depressed"},
                                 {"min":0.8,"max":1.2,"label":"Near trend","color":"neutral"},
                                 {"min":1.2,"max":5,"label":"Above trend","color":"elevated"}],
                       "what": "Compares current price to its 200-day average. Below 0.8 = deeply oversold. Above 1.2 = running hot."})

        # Price vs 365D SMA
        if n >= 365:
            sma365 = statistics.mean(closes[-365:])
            r365 = round(price / sma365, 4)
            st, ip = _band_sma(r365, "1-year")
            V.append({"name": "Price / 365d", "value": r365, "state": st, "interpretation": ip,
                       "formula": f"${price:,.0f} ÷ ${sma365:,.0f}", "source": src,
                       "history": rolling(sma_fn(365), 365), "hist_offset": 365,
                       "bands": [{"min":0,"max":0.8,"label":"Below trend","color":"depressed"},
                                 {"min":0.8,"max":1.2,"label":"Near trend","color":"neutral"},
                                 {"min":1.2,"max":5,"label":"Above trend","color":"elevated"}],
                       "what": "Same concept as 200d but over a full year. Helps identify longer cycle positions."})

        R["sections"]["valuation"] = {"title": "VALUATION", "metrics": V}

        # ══════════════════════════════════════════════════════
        # SECTION 2: NETWORK ACTIVITY
        # ══════════════════════════════════════════════════════
        NET = []

        if len(volumes) >= 30:
            minlen = min(len(volumes), len(closes))
            vol_usd = volumes[:minlen] if vol_is_usd else [volumes[i]*closes[i] for i in range(minlen)]

            # Full NVT history
            nvt_hist = []
            for idx in range(len(vol_usd)):
                if vol_usd[idx] > 0 and idx < len(mcaps):
                    nvt_hist.append(round(mcaps[idx] / vol_usd[idx], 1))

            med_nvt = statistics.median(nvt_hist) if len(nvt_hist) > 20 else None
            p25 = sorted(nvt_hist)[len(nvt_hist)//4] if len(nvt_hist) > 20 else None
            p75 = sorted(nvt_hist)[3*len(nvt_hist)//4] if len(nvt_hist) > 20 else None

            dv = vol_usd[-1] if vol_usd[-1] > 0 else (vol_usd[-2] if len(vol_usd) > 1 else 0)
            if dv > 0:
                nvt = round(mcap / dv, 1)
                ratio = nvt / med_nvt if med_nvt and med_nvt > 0 else 1
                st = "Supportive" if ratio < 0.7 else "Elevated" if ratio > 1.4 else "Neutral"
                ip = f"{'Below' if ratio<1 else 'Above'} historical median ({med_nvt:.0f})" if med_nvt else "Neutral"
                NET.append({"name": "NVT Ratio", "value": nvt, "state": st, "interpretation": ip,
                            "formula": "Market Cap ÷ Daily Volume", "source": src, "history": nvt_hist,
                            "median": round(med_nvt, 1) if med_nvt else None,
                            "bands": [{"min":0,"max":p25 or 0,"label":"Low (cheap)","color":"supportive"},
                                      {"min":p25 or 0,"max":p75 or 999,"label":"Normal","color":"neutral"},
                                      {"min":p75 or 999,"max":99999,"label":"High (expensive)","color":"elevated"}] if p25 and p75 else None,
                            "default_tf": "max",
                            "what": "NVT = 'P/E ratio of Bitcoin'. It compares network value to transaction volume. Low = cheap relative to usage. High = expensive relative to usage."})

            avg90 = statistics.mean(vol_usd[-min(90,len(vol_usd)):])
            if avg90 > 0:
                nvts = round(mcap / avg90, 1)
                NET.append({"name": "NVTS (Smoothed)", "value": nvts, "state": st,
                            "interpretation": "90-day smoothed version reduces daily noise",
                            "formula": "Market Cap ÷ 90d avg Volume", "source": src, "history": nvt_hist,
                            "bands": [{"min":0,"max":p25 or 0,"label":"Low","color":"supportive"},
                                      {"min":p25 or 0,"max":p75 or 999,"label":"Normal","color":"neutral"},
                                      {"min":p75 or 999,"max":99999,"label":"High","color":"elevated"}] if p25 and p75 else None,
                            "default_tf": "max",
                            "what": "Same as NVT but smoothed over 90 days to remove daily spikes."})

            NET.append({"name": "Daily Volume", "value": round(dv/1e9, 2), "unit": "$B",
                        "state": None, "interpretation": f"${dv/1e9:.1f}B traded in the last 24h",
                        "formula": "24h exchange volume", "source": src, "history": None,
                        "what": "How much Bitcoin was traded today in dollar terms."})

        # Unavailable network metrics
        for m in [("Active Addresses", "Unique addresses active in 24h", "Requires blockchain node — cannot compute from price data"),
                  ("On-Chain TX Count", "Transactions confirmed on-chain", "Requires blockchain node — cannot compute from price data")]:
            NET.append(_unavailable(m[0], m[1], m[2]))

        R["sections"]["network"] = {"title": "NETWORK ACTIVITY", "metrics": NET}

        # ══════════════════════════════════════════════════════
        # SECTION 3: MINER ECONOMICS
        # ══════════════════════════════════════════════════════
        MINER = []

        # PUELL MULTIPLE — computed from block reward × price
        if n >= 400 and len(dates) >= n:
            miner_rev_hist = []
            for idx in range(n):
                d = dates[idx] if idx < len(dates) else dates[-1]
                reward = _block_reward(d)
                daily_rev = reward * BLOCKS_PER_DAY * closes[idx]
                miner_rev_hist.append(daily_rev)

            # Puell = today's miner revenue / 365d average
            puell_hist = []
            for idx in range(365, n):
                avg365 = statistics.mean(miner_rev_hist[idx-365:idx])
                if avg365 > 0:
                    puell_hist.append(round(miner_rev_hist[idx] / avg365, 4))

            if puell_hist:
                puell = puell_hist[-1]
                st, ip = _band_puell(puell)
                MINER.append({"name": "Puell Multiple", "value": puell, "state": st, "interpretation": ip,
                              "formula": "Daily Miner Revenue ÷ 365d avg Miner Revenue",
                              "source": f"{src} (block reward × price)", "history": puell_hist, "hist_offset": 365,
                              "bands": [{"min":0,"max":0.5,"label":"Deep Stress","color":"depressed"},
                                        {"min":0.5,"max":1.0,"label":"Stressed","color":"supportive"},
                                        {"min":1.0,"max":4.0,"label":"Normal","color":"neutral"},
                                        {"min":4.0,"max":10,"label":"Overheated","color":"overheated"}],
                              "default_tf": "max",
                              "what": "Puell measures if miners are earning more or less than usual. Below 0.5 = miners are suffering (often near bottoms). Above 4 = miners earning a lot (often near tops)."})
                print(f"[BTC ON-CHAIN] Puell={puell}")

            # Daily miner revenue
            today_rev = miner_rev_hist[-1]
            MINER.append({"name": "Miner Revenue", "value": round(today_rev/1e6, 1), "unit": "$M/day",
                          "state": None, "interpretation": f"Miners earned ~${today_rev/1e6:.1f}M today from block rewards",
                          "formula": f"{_block_reward(dates[-1])} BTC/block × {BLOCKS_PER_DAY} blocks × ${price:,.0f}",
                          "source": src, "history": [round(v/1e6, 2) for v in miner_rev_hist[-min(500,len(miner_rev_hist)):]],
                          "what": f"Bitcoin miners currently earn {_block_reward(dates[-1])} BTC per block they mine. At ${price:,.0f} per BTC, that's ~${today_rev/1e6:.1f}M per day."})

        # Hashrate and difficulty — genuinely unavailable
        for m in [("Hashrate", "Network hash power (EH/s)", "Requires mining pool data — not in price feeds"),
                  ("Difficulty", "Mining difficulty target", "Requires blockchain node data")]:
            MINER.append(_unavailable(m[0], m[1], m[2]))

        R["sections"]["miner"] = {"title": "MINER ECONOMICS", "metrics": MINER}

        # ══════════════════════════════════════════════════════
        # SECTION 4: RISK CONTEXT
        # ══════════════════════════════════════════════════════
        RISK = []

        # Drawdown from ATH
        ath = max(closes)
        dd = round((price - ath) / ath * 100, 2)
        dd_hist = []
        running_ath = closes[0]
        for idx in range(n):
            running_ath = max(running_ath, closes[idx])
            dd_hist.append(round((closes[idx] - running_ath) / running_ath * 100, 2))
        RISK.append({"name": "Drawdown from ATH", "value": dd, "unit": "%",
                     "state": "Depressed" if dd < -50 else "Stressed" if dd < -25 else "Fair" if dd < -10 else "Neutral",
                     "interpretation": f"Currently {abs(dd):.1f}% below all-time high of ${ath:,.0f}",
                     "formula": "(Price − ATH) ÷ ATH × 100", "source": src, "history": dd_hist, "hist_offset": 0,
                     "bands": [{"min":-100,"max":-50,"label":"Deep drawdown","color":"depressed"},
                               {"min":-50,"max":-25,"label":"Moderate","color":"elevated"},
                               {"min":-25,"max":0,"label":"Mild / near ATH","color":"neutral"}],
                     "what": f"How far Bitcoin has fallen from its highest ever price (${ath:,.0f}). -50% or worse has historically been rare and often a long-term opportunity."})

        # Days since ATH
        ath_idx = closes.index(ath)
        days_since = n - 1 - ath_idx
        RISK.append({"name": "Days Since ATH", "value": days_since, "unit": "days",
                     "state": None, "interpretation": f"ATH ${ath:,.0f} was {days_since} days ago",
                     "formula": "Calendar days since highest close", "source": src, "history": None,
                     "what": "How many days since Bitcoin last made a new all-time high. Long periods away from ATH often precede explosive moves."})

        # Volatility
        if n >= 30:
            vol_hist = []
            for idx in range(30, n):
                rets = [(closes[j]-closes[j-1])/closes[j-1] for j in range(idx-29, idx+1)]
                vol_hist.append(round(statistics.stdev(rets) * math.sqrt(365) * 100, 1))
            vol_30d = vol_hist[-1] if vol_hist else 0
            st = "Calm" if vol_30d < 40 else "Normal" if vol_30d < 70 else "Elevated" if vol_30d < 100 else "Extreme"
            RISK.append({"name": "Volatility (30d)", "value": vol_30d, "unit": "%",
                         "state": st, "interpretation": f"30-day annualized volatility at {vol_30d:.0f}%",
                         "formula": "σ(daily returns) × √365 × 100", "source": src, "history": vol_hist, "hist_offset": 30,
                         "bands": [{"min":0,"max":40,"label":"Calm","color":"supportive"},
                                   {"min":40,"max":70,"label":"Normal","color":"neutral"},
                                   {"min":70,"max":100,"label":"Elevated","color":"elevated"},
                                   {"min":100,"max":300,"label":"Extreme","color":"overheated"}],
                         "what": "How much Bitcoin's price swings around. Below 40% = unusually calm. Above 100% = extremely volatile. For reference, stocks are usually 15-25%."})

        # Volume trend
        if len(volumes) >= 60:
            avg_r = statistics.mean(volumes[-30:])
            avg_p = statistics.mean(volumes[-60:-30])
            if avg_p > 0:
                lt = round((avg_r - avg_p) / avg_p * 100, 1)
                st = "Declining" if lt < -20 else "Stable" if abs(lt) < 20 else "Increasing"
                RISK.append({"name": "Volume Trend", "value": lt, "unit": "%",
                             "state": st, "interpretation": f"Trading volume {'decreased' if lt<0 else 'increased'} {abs(lt):.0f}% vs prior month",
                             "formula": "(30d avg vol − prior 30d avg) ÷ prior × 100", "source": src, "history": None,
                             "what": "Is trading activity increasing or decreasing? Rising volume during price moves = conviction. Falling volume = uncertainty."})

        R["sections"]["risk"] = {"title": "RISK CONTEXT", "metrics": RISK}

        total = sum(len(s["metrics"]) for s in R["sections"].values())
        computed = sum(1 for s in R["sections"].values() for m in s["metrics"] if m.get("value") is not None)
        print(f"[BTC ON-CHAIN] DONE — {computed}/{total} metrics computed")
        return R

    except Exception as e:
        print(f"[BTC ON-CHAIN] EXCEPTION: {e}")
        import traceback; traceback.print_exc()
        R["error"] = str(e)
        return R
