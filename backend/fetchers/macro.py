# fetchers/macro.py
# Source: FRED (Federal Reserve Economic Data) — official, free
# Get your key at: https://fred.stlouisfed.org/docs/api/api_key.html
# Also fetches VIX, DXY, HYG, LQD via yfinance (no key needed)

import os
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from fredapi import Fred
import logging

logger = logging.getLogger(__name__)

# ── FRED Series IDs ───────────────────────────────────────────
# All official FRED series — free, reliable, official source
FRED_SERIES = {
    "us10y":    "DGS10",         # US 10-Year Treasury Yield (daily)
    "us2y":     "DGS2",          # US 2-Year Treasury Yield (daily)
    "us3m":     "DTB3",          # US 3-Month T-Bill (daily)
    "hy_oas":   "BAMLH0A0HYM2",  # High Yield OAS — BAML (daily)
    "m2":       "M2SL",          # M2 Money Supply (monthly)
    "fed_bal":  "WALCL",         # Fed Balance Sheet (weekly)
    "inflation_be": "T10YIE",    # 10Y Breakeven Inflation (daily)
    "recession_prob": "RECPROUSM156N",  # Recession probability (monthly)
    "real_gdp_growth": "A191RL1Q225SBEA",  # Real GDP Growth (quarterly)
}

# ── Yahoo Finance tickers for market data ────────────────────
YF_TICKERS = {
    "vix":     "^VIX",    # CBOE VIX Index
    "dxy":     "DX-Y.NYB",# Dollar Index
    "wti":     "CL=F",    # WTI Crude Oil Futures
    "brent":   "BZ=F",    # Brent Crude Oil Futures
    "hyg":     "HYG",     # iShares High Yield Bond ETF
    "lqd":     "LQD",     # iShares Investment Grade Bond ETF
    "spy":     "SPY",     # S&P 500 ETF
    "rsp":     "RSP",     # Equal Weight S&P 500 ETF
    "qqq":     "QQQ",     # NASDAQ ETF
    "tlt":     "TLT",     # 20Y Treasury ETF (liquidity proxy)
    "gld":     "GLD",     # Gold
}

DAYS_HISTORY = 6000  # ~16 years of daily data (back to ~2008)


def fetch_fred_series(api_key: str, series_id: str, days: int = DAYS_HISTORY) -> list:
    """Fetch a FRED time series — daily (FRED doesn't publish hourly)."""
    try:
        fred = Fred(api_key=api_key)
        end = datetime.today()
        start = end - timedelta(days=days + 14)
        s = fred.get_series(series_id, observation_start=start, observation_end=end)
        s = s.dropna()
        if s.empty:
            return []
        s.index = pd.to_datetime(s.index)
        result = [round(float(v), 4) for v in s.tail(days)]
        return result
    except Exception as e:
        logger.error(f"FRED series {series_id} failed: {e}")
        return []


def fetch_yf_series(ticker: str, days: int = DAYS_HISTORY) -> list:
    """Fetch close prices for a Yahoo Finance ticker. Tries longest period, falls back to shorter."""
    try:
        tk = yf.Ticker(ticker)
        if days <= 30:
            df = tk.history(period=f"{days}d", interval="1h", auto_adjust=True)
            if df is None or df.empty:
                df = tk.history(period=f"{days}d", interval="1d", auto_adjust=True)
        else:
            # Build fallback chain from longest to shortest
            periods = []
            if days > 3650: periods.append("max")
            if days > 1825: periods.append("10y")
            if days > 730:  periods.append("5y")
            periods.extend(["2y", "1y", "6mo", "3mo"])

            df = None
            for p in periods:
                try:
                    df = tk.history(period=p, interval="1d", auto_adjust=True)
                    if df is not None and not df.empty:
                        break
                except Exception:
                    continue
            if df is None or df.empty:
                return []

        if df is None or df.empty:
            return []
        # Handle MultiIndex columns (yfinance sometimes returns ('Close','BZ=F') instead of 'Close')
        if isinstance(df.columns, pd.MultiIndex):
            if 'Close' in df.columns.get_level_values(0):
                closes = df['Close'].iloc[:, 0].dropna()
            else:
                return []
        elif 'Close' in df.columns:
            closes = df["Close"].dropna()
        else:
            return []
        if closes.empty:
            return []
        result = [round(float(v), 4) for v in closes]
        return result
    except Exception as e:
        logger.error(f"YF series {ticker} failed: {e}")
        return []


def fetch_macro_snapshot(fred_api_key: str) -> dict:
    """
    Full macro snapshot — all indicators from LE_CHANGEMENT_DANS_LA_BOURSE.txt
    Returns current values + 52-week history for every chart
    """
    fred = Fred(api_key=fred_api_key) if fred_api_key and fred_api_key != "your_fred_api_key_here" else None
    result = {}

    # ── 1. LES TAUX (Le coût de l'argent) ───────────────────
    logger.info("Fetching rates...")

    if fred:
        # US 10Y — Zone Confort/Friction/Danger from document
        us10y_h = fetch_fred_series(fred_api_key, "DGS10")
        us2y_h  = fetch_fred_series(fred_api_key, "DGS2")
        us3m_h  = fetch_fred_series(fred_api_key, "DTB3")
    else:
        # Fallback: use TLT/SHY as proxy if no FRED key
        logger.warning("No FRED key — using YF proxy for rates")
        us10y_h = fetch_yf_series("^TNX")   # 10Y yield
        us2y_h  = fetch_yf_series("^IRX")   # proxy
        us3m_h  = []

    us10y = us10y_h[-1] if us10y_h else None
    us2y  = us2y_h[-1] if us2y_h else None
    us3m  = us3m_h[-1] if us3m_h else None

    # Spread 10Y-2Y — Phase A/B/C logic from document
    spread = round(us10y - us2y, 3) if (us10y and us2y) else None
    spread_h = [round(a - b, 3) for a, b in zip(us10y_h, us2y_h)] if (us10y_h and us2y_h) else []

    result.update({
        "us10y": us10y, "us10y_h": us10y_h,
        "us2y":  us2y,  "us2y_h":  us2y_h,
        "us3m":  us3m,  "us3m_h":  us3m_h,
        "spread": spread, "spread_h": spread_h,
    })

    # ── 2. LE CRÉDIT (Le stress financier) ───────────────────
    logger.info("Fetching credit...")

    # HYG/LQD ratio — from document
    hyg_h = fetch_yf_series("HYG")
    lqd_h = fetch_yf_series("LQD")
    n = min(len(hyg_h), len(lqd_h))
    hyg_lqd_h = [round(h/l, 4) for h,l in zip(hyg_h[-n:], lqd_h[-n:])] if n > 0 else []
    hyg_lqd = hyg_lqd_h[-1] if hyg_lqd_h else None

    # HY OAS — official FRED series
    oas_h = fetch_fred_series(fred_api_key, "BAMLH0A0HYM2") if fred else []
    oas = oas_h[-1] if oas_h else None

    result.update({
        "hyg_lqd": hyg_lqd, "hyg_lqd_h": hyg_lqd_h,
        "oas":     oas,      "oas_h":      oas_h,
    })

    # ── 3. LE POSITIONNEMENT (Le carburant) ──────────────────
    logger.info("Fetching positioning...")

    vix_h = fetch_yf_series("^VIX")
    vix   = vix_h[-1] if vix_h else None

    # Regional volatility indices / proxies
    vstoxx_h = fetch_yf_series("^STOXX50E")   # Euro STOXX 50
    nikkei_h = fetch_yf_series("^N225")        # Nikkei 225
    hsi_h    = fetch_yf_series("^HSI")         # Hang Seng

    result.update({
        "vix": vix, "vix_h": vix_h,
        "vstoxx_h": vstoxx_h,
        "nikkei_h": nikkei_h,
        "hsi_h":    hsi_h,
    })

    # ── 4. LA LARGEUR DU MARCHÉ (La santé réelle) ────────────
    logger.info("Fetching breadth...")

    spy_h = fetch_yf_series("SPY")
    rsp_h = fetch_yf_series("RSP")
    n2 = min(len(spy_h), len(rsp_h))
    rsp_spy_h = [round(r/s, 4) for r,s in zip(rsp_h[-n2:], spy_h[-n2:])] if n2 > 0 else []
    rsp_spy = rsp_spy_h[-1] if rsp_spy_h else None

    # A/D line proxy: use NYSE advancing/declining issues
    # FRED: USAA — Advancing Issues, USAB — Declining Issues (if available)
    # Fallback: simulate from RSP vs SPY divergence
    ad_h = []
    if fred:
        try:
            adv = fetch_fred_series(fred_api_key, "ADVN", days=DAYS_HISTORY)
            dec = fetch_fred_series(fred_api_key, "DECN", days=DAYS_HISTORY)
            if adv and dec:
                n3 = min(len(adv), len(dec))
                cumulative = 0
                for a, d in zip(adv[-n3:], dec[-n3:]):
                    cumulative += (a - d)
                    ad_h.append(round(cumulative, 0))
        except:
            pass

    result.update({
        "spy_h":    spy_h,
        "rsp_spy":  rsp_spy, "rsp_spy_h": rsp_spy_h,
        "ad_line":  ad_h[-1] if ad_h else None, "ad_h": ad_h,
    })

    # ── 5. LA LIQUIDITÉ ET LA MONNAIE (Le robinet) ───────────
    logger.info("Fetching liquidity...")

    dxy_h = fetch_yf_series("DX-Y.NYB")
    if not dxy_h:
        dxy_h = fetch_yf_series("UUP")  # Dollar Bull ETF fallback
    dxy   = dxy_h[-1] if dxy_h else None

    wti_h = fetch_yf_series("CL=F")
    wti   = wti_h[-1] if wti_h else None

    brent_h = fetch_yf_series("BZ=F")
    if not brent_h:
        brent_h = fetch_yf_series("EB=F")  # ICE Brent fallback
    if not brent_h:
        brent_h = fetch_yf_series("BNO")   # Brent Oil ETF fallback
    brent   = brent_h[-1] if brent_h else None

    # M2 + Fed Balance Sheet — FRED
    m2_h        = fetch_fred_series(fred_api_key, "M2SL") if fred else []
    fed_bal_h   = fetch_fred_series(fred_api_key, "WALCL") if fred else []
    inflation_h = fetch_fred_series(fred_api_key, "T10YIE") if fred else []

    # Liquidity proxy: Fed Balance + M2 combined normalized
    liq_h = fed_bal_h if fed_bal_h else m2_h

    m2_growth = None
    if m2_h and len(m2_h) >= 52:
        m2_growth = round(((m2_h[-1] / m2_h[-52]) - 1) * 100, 2)

    fed_balance = round(fed_bal_h[-1] / 1e6, 2) if fed_bal_h else None  # trillions

    # Recession probability
    rec_h   = fetch_fred_series(fred_api_key, "RECPROUSM156N") if fred else []
    rec_prob = rec_h[-1] if rec_h else None

    result.update({
        "dxy":  dxy,  "dxy_h":  dxy_h,
        "wti":  wti,  "wti_h":  wti_h,
        "brent": brent, "brent_h": brent_h,
        "m2_growth":    m2_growth,
        "fed_balance":  fed_balance,
        "fed_bal_h":    [round(v/1e6, 2) for v in fed_bal_h] if fed_bal_h else [],
        "liq_h":        [round(v/1e6, 4) if v > 1e5 else v for v in liq_h] if liq_h else [],
        "inflation_be": inflation_h[-1] if inflation_h else None,
        "inflation_h":  inflation_h,
        "recession_prob": rec_prob,
    })

    # ── Labels for charts (hourly format) ─────────────────────
    # Labels are approximate — actual data points are hourly from YF
    labels = []
    today = datetime.today()
    for i in range(DAYS_HISTORY, 0, -1):
        d = today - timedelta(days=i)
        labels.append(d.strftime("%b %d"))
    result["weeks"] = labels  # keep key name for frontend compat

    result["source"]  = "FRED (official) + Yahoo Finance"
    result["updated"] = datetime.utcnow().isoformat()
    result["fred_available"] = fred is not None

    logger.info("Macro snapshot complete")
    return result
