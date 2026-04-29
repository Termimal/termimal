# fetchers/prices.py
# Source: Yahoo Finance via yfinance (free, no API key needed)
# Data: real-time delayed prices + fundamentals for any ticker

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# All tickers in our universe
UNIVERSE = [
    "AAPL","MSFT","NVDA","GOOGL","META","AMZN","TSLA","JPM","BAC","GS",
    "XOM","CVX","JNJ","UNH","WMT","PG","BRK-B","V","MA","HD",
    "CAT","BA","INTC","AMD","PLTR","PFE","FCX","C","WFC",
    "ASML","TM","TSM","SPY","QQQ","HYG","LQD","GLD","TLT","RSP",
    # Forex
    "EURUSD=X","GBPUSD=X","USDJPY=X","USDCHF=X","AUDUSD=X","USDCAD=X","NZDUSD=X",
    "EURGBP=X","EURJPY=X",
    # Crypto
    "BTC-USD","ETH-USD","SOL-USD","XRP-USD","ADA-USD",
]

def fetch_price_snapshot(tickers: list[str]) -> dict:
    """
    Fetch latest price + basic info for a list of tickers.
    Returns dict keyed by ticker symbol.
    """
    result = {}
    try:
        # Batch download — much faster than one by one
        data = yf.download(
            tickers,
            period="5d",
            interval="1d",
            group_by="ticker",
            auto_adjust=True,
            progress=False,
            threads=True
        )

        for sym in tickers:
            try:
                if len(tickers) == 1:
                    df = data
                else:
                    df = data[sym] if sym in data.columns.get_level_values(0) else None

                if df is None or df.empty:
                    result[sym] = {"error": "no data"}
                    continue

                df = df.dropna()
                if len(df) < 2:
                    result[sym] = {"error": "insufficient data"}
                    continue

                last  = float(df["Close"].iloc[-1])
                prev  = float(df["Close"].iloc[-2])
                chg   = last - prev
                pct   = (chg / prev) * 100
                vol   = int(df["Volume"].iloc[-1]) if "Volume" in df else 0

                result[sym] = {
                    "price": round(last, 6),
                    "prev":  round(prev, 6),
                    "chg":   round(chg, 6),
                    "pct":   round(pct, 2),
                    "open":  round(float(df["Open"].iloc[-1]), 6),
                    "high":  round(float(df["High"].iloc[-1]), 6),
                    "low":   round(float(df["Low"].iloc[-1]), 6),
                    "vol":   vol,
                    "date":  str(df.index[-1].date()),
                    "source": "Yahoo Finance",
                    "updated": datetime.utcnow().isoformat()
                }

            except Exception as e:
                logger.warning(f"Price error for {sym}: {e}")
                result[sym] = {"error": str(e)}

    except Exception as e:
        logger.error(f"Batch price fetch failed: {e}")

    return result


def fetch_price_history(ticker: str, period: str = "1y", interval: str = "") -> dict:
    """
    Fetch OHLCV history for charts.
    period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y
    interval auto-selected based on period:
      1d  → 5m  (5-minute bars)
      5d  → 15m
      1mo → 1h  (hourly bars)
      3mo → 1d  (daily bars)
      6mo+ → 1d
    """
    try:
        # Auto-select interval based on period if not specified
        if not interval:
            interval_map = {
                "1d":  "5m",
                "5d":  "5m",
                "1mo": "1h",
                "3mo": "1d",
                "6mo": "1d",
                "1y":  "1d",
                "2y":  "1wk",
                "5y":  "1wk",
                "max": "1wk",
            }
            interval = interval_map.get(period, "1d")

        tk = yf.Ticker(ticker)
        df = tk.history(period=period, interval=interval, auto_adjust=True)
        if df.empty:
            return {"error": "no data"}

        # Format dates based on interval
        if interval in ("5m", "15m", "30m", "1h"):
            dates = [d.strftime("%Y-%m-%d %H:%M") for d in df.index]
        else:
            dates = [str(d.date()) for d in df.index]

        return {
            "ticker":   ticker,
            "period":   period,
            "interval": interval,
            "dates":    dates,
            "open":     [round(float(v), 6) for v in df["Open"]],
            "high":     [round(float(v), 6) for v in df["High"]],
            "low":      [round(float(v), 6) for v in df["Low"]],
            "close":    [round(float(v), 6) for v in df["Close"]],
            "volume":   [int(v) for v in df["Volume"]],
            "source":   "Yahoo Finance",
            "updated":  datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"History fetch failed for {ticker}: {e}")
        return {"error": str(e)}


def fetch_fundamentals(ticker: str) -> dict:
    """
    Fetch company fundamentals from Yahoo Finance.
    Maps to exact indicators from Analyse_Fondamental.txt
    """
    try:
        tk = yf.Ticker(ticker)
        info = tk.info

        if not info or "symbol" not in info:
            return {"error": "no info"}

        # --- Income statement ---
        income = tk.income_stmt  # annual
        balance = tk.balance_sheet
        cashflow = tk.cashflow

        def safe(d, key, default=None):
            try:
                v = d.get(key)
                return float(v) if v is not None else default
            except:
                return default

        def stmt_val(df, row, col=0):
            """Get value from financial statement dataframe"""
            try:
                if df is None or df.empty or row not in df.index:
                    return None
                return float(df.loc[row].iloc[col])
            except:
                return None

        # Price & market data
        price    = safe(info, "currentPrice") or safe(info, "regularMarketPrice")
        mktcap   = safe(info, "marketCap")
        shares   = safe(info, "sharesOutstanding")

        # From income statement (TTM)
        revenue  = stmt_val(income, "Total Revenue")
        ebit     = stmt_val(income, "EBIT")
        ebitda_i = safe(info, "ebitda")
        net_inc  = stmt_val(income, "Net Income")
        interest = stmt_val(income, "Interest Expense")
        gross_p  = stmt_val(income, "Gross Profit")
        cogs_v   = stmt_val(income, "Cost Of Revenue") or stmt_val(income, "Reconciled Cost Of Revenue")
        pretax   = stmt_val(income, "Pretax Income")

        # From balance sheet
        total_debt   = stmt_val(balance, "Total Debt") or (
                       (stmt_val(balance,"Long Term Debt") or 0) +
                       (stmt_val(balance,"Current Debt") or 0))
        cash         = stmt_val(balance, "Cash And Cash Equivalents") or \
                       stmt_val(balance, "Cash Cash Equivalents And Short Term Investments")
        equity       = stmt_val(balance, "Stockholders Equity") or \
                       stmt_val(balance, "Common Stock Equity")
        total_assets = stmt_val(balance, "Total Assets")

        # From cashflow
        cfo_v   = stmt_val(cashflow, "Operating Cash Flow") or \
                  stmt_val(cashflow, "Cash Flow From Continuing Operating Activities")
        capex_v = stmt_val(cashflow, "Capital Expenditure")

        # --- Computed indicators (Analyse_Fondamental.txt formulas) ---
        net_debt = (total_debt - cash) if (total_debt and cash) else None
        fcf      = (cfo_v + capex_v) if (cfo_v and capex_v) else None  # capex is negative
        ev       = (mktcap + (total_debt or 0) - (cash or 0)) if mktcap else None

        # I) Debt/EBITDA — Dette nette / EBITDA
        ebitda_use = ebitda_i or (ebit + abs(stmt_val(income,"Depreciation And Amortization") or 0)) if ebit else None
        debt_ebitda = round(net_debt / ebitda_use, 2) if (net_debt and ebitda_use and ebitda_use > 0) else None

        # II) Interest Coverage — EBIT / Intérêts
        int_cov = round(ebit / abs(interest), 2) if (ebit and interest and interest != 0) else None

        # III) FCF Yield — FCF / Market Cap * 100
        fcf_yield = round((fcf / mktcap) * 100, 2) if (fcf and mktcap and mktcap > 0) else None

        # IV) CFO
        cfo_b = round(cfo_v / 1e9, 2) if cfo_v else None

        # V) ROIC — NOPAT / Capital Investi
        tax_rate = 0.21  # approximate US corporate tax
        nopat    = ebit * (1 - tax_rate) if ebit else None
        cap_inv  = (net_debt + equity) if (net_debt is not None and equity) else None
        roic     = round((nopat / cap_inv) * 100, 2) if (nopat and cap_inv and cap_inv > 0) else None

        # VI) Margins
        gross_mgn  = round((gross_p / revenue) * 100, 2) if (gross_p and revenue) else None
        op_mgn     = round((ebit / revenue) * 100, 2) if (ebit and revenue) else None
        pretax_mgn = round((pretax / revenue) * 100, 2) if (pretax and revenue) else None
        net_mgn    = round((net_inc / revenue) * 100, 2) if (net_inc and revenue) else None

        # VII) ROE
        roe = round((net_inc / equity) * 100, 2) if (net_inc and equity and equity > 0) else None

        # VIII) Debt-to-Equity
        de = round(total_debt / equity, 2) if (total_debt and equity and equity > 0) else None

        # IX) EV/EBITDA
        ev_ebitda = round(ev / ebitda_use, 2) if (ev and ebitda_use and ebitda_use > 0) else None

        # FCF in billions
        fcf_b = round(fcf / 1e9, 2) if fcf else None

        # Additional
        eps    = safe(info, "trailingEps")
        trail_pe = safe(info, "trailingPE")
        beta   = safe(info, "beta")
        pb     = safe(info, "priceToBook")
        peg    = safe(info, "pegRatio")
        fwd_pe = safe(info, "forwardPE")
        div_yield = safe(info, "dividendYield")

        # ── Compute proper Beta from 2Y weekly returns vs SPY ──
        computed_beta = None
        computed_alpha = None
        try:
            stock_hist = yf.download(ticker, period="2y", interval="1wk", progress=False, auto_adjust=True)
            spy_hist   = yf.download("SPY",   period="2y", interval="1wk", progress=False, auto_adjust=True)
            if stock_hist is not None and spy_hist is not None and len(stock_hist) > 20 and len(spy_hist) > 20:
                # Extract Close column — handle both flat and MultiIndex
                def get_close(df):
                    if isinstance(df.columns, pd.MultiIndex):
                        if "Close" in df.columns.get_level_values(0):
                            return df["Close"].iloc[:, 0].dropna() if hasattr(df["Close"], 'iloc') else df["Close"].dropna()
                    if "Close" in df.columns:
                        col = df["Close"]
                        return col.iloc[:, 0].dropna() if hasattr(col, 'iloc') and len(col.shape) > 1 else col.dropna()
                    return pd.Series(dtype=float)

                stock_close = get_close(stock_hist)
                spy_close   = get_close(spy_hist)
                common = stock_close.index.intersection(spy_close.index)
                if len(common) > 20:
                    sr = stock_close.loc[common].pct_change().dropna()
                    mr = spy_close.loc[common].pct_change().dropna()
                    common2 = sr.index.intersection(mr.index)
                    sr = sr.loc[common2]
                    mr = mr.loc[common2]
                    if len(sr) > 20:
                        cov = sr.cov(mr)
                        var = mr.var()
                        if var > 0:
                            computed_beta = round(cov / var, 2)
                        # Alpha = annualized excess return
                        ann_stock = (1 + sr.mean()) ** 52 - 1
                        ann_market = (1 + mr.mean()) ** 52 - 1
                        rf = 0.043  # ~4.3% risk-free
                        if computed_beta is not None:
                            computed_alpha = round((ann_stock - rf - computed_beta * (ann_market - rf)) * 100, 2)
        except Exception as beta_e:
            logger.debug(f"Beta/Alpha computation failed for {ticker}: {beta_e}")

        # Use computed beta if available AND reasonable, otherwise fall back to yfinance
        yf_beta = round(beta, 2) if beta else None
        if computed_beta is not None and 0.05 < computed_beta < 5.0:
            final_beta = computed_beta
        elif yf_beta is not None:
            final_beta = yf_beta
        else:
            final_beta = computed_beta  # last resort
        logger.info(f"Beta for {ticker}: computed={computed_beta}, yfinance={yf_beta}, final={final_beta}")

        # ── CAGR Revenue (from annual income statements) ──
        cagr_revenue = None
        try:
            if income is not None and not income.empty and "Total Revenue" in income.index:
                rev_series = income.loc["Total Revenue"].dropna()
                if len(rev_series) >= 2:
                    newest = float(rev_series.iloc[0])
                    oldest = float(rev_series.iloc[-1])
                    n_years = len(rev_series) - 1
                    if oldest > 0 and newest > 0 and n_years > 0:
                        cagr_revenue = round(((newest / oldest) ** (1.0 / n_years) - 1) * 100, 2)
        except Exception:
            pass

        # ── Cash Runway (tech/growth: Cash / annual FCF burn) ──
        cash_runway = None
        try:
            if cash and fcf and fcf < 0:
                cash_runway = round((cash / abs(fcf)) * 12, 1)  # months
            elif cash and cfo_v and cfo_v < 0:
                cash_runway = round((cash / abs(cfo_v)) * 12, 1)
        except Exception:
            pass

        # ── Bank-specific: NIM, NPL, CET1 ──
        # yfinance doesn't provide these directly; approximate from available data
        nim_val = None
        npl_val = None
        cet1_val = None
        cost_income = None
        loan_to_deposit = None

        sector_raw = info.get("sector", "").lower()
        industry_raw = info.get("industry", "").lower()
        is_bank = "bank" in sector_raw or "bank" in industry_raw or "financial" in sector_raw

        if is_bank:
            try:
                # NIM approximation: Net Interest Income / Total Assets
                net_int_inc = stmt_val(income, "Net Interest Income")
                if net_int_inc and total_assets and total_assets > 0:
                    nim_val = round((net_int_inc / total_assets) * 100, 2)

                # Cost-to-Income: Operating Expense / Revenue
                op_expense = stmt_val(income, "Operating Expense") or stmt_val(income, "Total Expenses")
                if op_expense and revenue and revenue > 0:
                    cost_income = round((abs(op_expense) / revenue) * 100, 1)

                # NPL and CET1 from yfinance info (some brokers report these)
                # These typically require EDGAR or specialized data
                # For now: mark as needing EDGAR supplement
            except Exception:
                pass

        # 52W
        h52 = safe(info, "fiftyTwoWeekHigh")
        l52 = safe(info, "fiftyTwoWeekLow")
        avg_vol = safe(info, "averageVolume")
        earn_date = info.get("earningsDate", None)

        # Historical revenue/ebitda/fcf (last 4 years + TTM)
        rev_hist = []
        ebitda_hist = []
        fcf_hist = []
        netmgn_hist = []
        opmgn_hist = []

        try:
            if income is not None and not income.empty:
                rev_row = income.loc["Total Revenue"] if "Total Revenue" in income.index else None
                ebit_row = income.loc["EBIT"] if "EBIT" in income.index else None
                ni_row = income.loc["Net Income"] if "Net Income" in income.index else None
                if rev_row is not None:
                    for i in range(min(5, len(rev_row))):
                        rv = float(rev_row.iloc[i]) / 1e9 if rev_row.iloc[i] else None
                        rev_hist.append(round(rv, 1) if rv else None)
                        if ebit_row is not None and i < len(ebit_row):
                            ev_v = float(ebit_row.iloc[i]) / 1e9 if ebit_row.iloc[i] else None
                            ebitda_hist.append(round(ev_v * 1.15, 1) if ev_v else None)  # rough EBITDA proxy
                        if ni_row is not None and i < len(ni_row) and rev_row.iloc[i]:
                            nm = (float(ni_row.iloc[i]) / float(rev_row.iloc[i])) * 100
                            netmgn_hist.append(round(nm, 1))
                        if ebit_row is not None and i < len(ebit_row) and rev_row.iloc[i]:
                            om = (float(ebit_row.iloc[i]) / float(rev_row.iloc[i])) * 100
                            opmgn_hist.append(round(om, 1))
                rev_hist.reverse()
                ebitda_hist.reverse()
                netmgn_hist.reverse()
                opmgn_hist.reverse()

            if cashflow is not None and not cashflow.empty:
                cfo_row = cashflow.loc["Operating Cash Flow"] if "Operating Cash Flow" in cashflow.index else None
                cap_row = cashflow.loc["Capital Expenditure"] if "Capital Expenditure" in cashflow.index else None
                if cfo_row is not None and cap_row is not None:
                    for i in range(min(5, len(cfo_row))):
                        cf_v = float(cfo_row.iloc[i]) if cfo_row.iloc[i] else None
                        cx_v = float(cap_row.iloc[i]) if cap_row.iloc[i] else None
                        if cf_v and cx_v:
                            fcf_hist.append(round((cf_v + cx_v) / 1e9, 1))
                        else:
                            fcf_hist.append(None)
                    fcf_hist.reverse()
        except Exception as hist_e:
            logger.warning(f"Historical data error for {ticker}: {hist_e}")

        return {
            "ticker":   ticker,
            "name":     info.get("longName", ticker),
            "sector":   info.get("sector", "Unknown"),
            "industry": info.get("industry", "Unknown"),
            "exchange": info.get("exchange", ""),
            "currency": info.get("currency", "USD"),

            # Price
            "price":    round(price, 6) if price else None,
            "mcap":     round(mktcap / 1e9, 1) if mktcap else None,
            "ev":       round(ev / 1e9, 1) if ev else None,
            "beta":     final_beta,
            "h52":      round(h52, 6) if h52 else None,
            "l52":      round(l52, 6) if l52 else None,
            "avg_vol":  int(avg_vol) if avg_vol else None,
            "eps":      round(eps, 2) if eps else None,
            "pe":       round(trail_pe, 2) if trail_pe else None,
            "pb":       round(pb, 2) if pb else None,
            "peg":      round(peg, 2) if peg else None,
            "fwd_pe":   round(fwd_pe, 2) if fwd_pe else None,
            "div_yield":round(div_yield * 100, 2) if div_yield else None,

            # Analyse_Fondamental indicators
            "rev":      round(revenue / 1e9, 1) if revenue else None,
            "ebitda":   round(ebitda_use / 1e9, 1) if ebitda_use else None,
            "fcf":      fcf_b,
            "cfo":      cfo_b,
            "net_debt": round(net_debt / 1e9, 1) if net_debt else None,

            "dEbitda":  debt_ebitda,   # I)  Debt/EBITDA
            "intCov":   int_cov,       # II) Interest Coverage
            "fcfYld":   fcf_yield,     # III) FCF Yield
            "roic":     roic,          # V)  ROIC
            "gMgn":     gross_mgn,     # VI) Gross Margin
            "opMgn":    op_mgn,        # VI) Operating Margin
            "preMgn":   pretax_mgn,    # VI) Pretax Margin
            "netMgn":   net_mgn,       # VI) Net Margin
            "roe":      roe,           # VII) ROE
            "de":       de,            # VIII) Debt/Equity
            "evEbitda": ev_ebitda,     # IX) EV/EBITDA

            # NEW: Missing indicators
            "cagr":      cagr_revenue,    # CAGR Revenue
            "alpha":     computed_alpha,  # Jensen's Alpha
            "cashRunway":cash_runway,     # Cash Runway (months)

            # Bank-specific
            "nim":      nim_val,          # Net Interest Margin
            "npl":      npl_val,          # Non-Performing Loans (needs EDGAR)
            "cet1":     cet1_val,         # CET1 (needs EDGAR)
            "costInc":  cost_income,      # Cost-to-Income
            "ltd":      loan_to_deposit,  # Loan-to-Deposit (needs EDGAR)

            # Historical arrays (5 years)
            "rev_hist":    rev_hist or [],
            "ebitda_hist": ebitda_hist or [],
            "fcf_hist":    fcf_hist or [],
            "netMgn_hist": netmgn_hist or [],
            "opMgn_hist":  opmgn_hist or [],

            "source":  "Yahoo Finance (yfinance)",
            "updated": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Fundamentals fetch failed for {ticker}: {e}")
        return {"error": str(e), "ticker": ticker}
