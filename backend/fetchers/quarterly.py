# fetchers/quarterly.py
# Real quarterly financial data per ticker
# Sources (in priority order):
#   1. yfinance  — free, no key, quarterly statements
#   2. FMP       — free tier 250 req/day, key needed, cleaner data
#   3. Alpha Vantage — free tier 25 req/day, key needed

import os
import logging
import requests
import yfinance as yf
from datetime import datetime

logger = logging.getLogger(__name__)

FMP_KEY = os.getenv("FMP_API_KEY", "")
AV_KEY  = os.getenv("ALPHAVANTAGE_API_KEY", "")

# ─── Quarter label helper ─────────────────────────────────────
def date_to_quarter(dt) -> str:
    """Convert a date to 'Q3 2024' label."""
    try:
        if hasattr(dt, 'year'):
            y, m = dt.year, dt.month
        else:
            d = datetime.fromisoformat(str(dt)[:10])
            y, m = d.year, d.month
        q = (m - 1) // 3 + 1
        return f"Q{q} {y}"
    except Exception:
        return str(dt)[:7]


# ─── yfinance quarterly statements ────────────────────────────
def fetch_quarterly_yf(ticker: str) -> dict:
    """
    Fetch last 8 quarters of key metrics from yfinance.
    Returns dict with arrays for each metric, newest first.
    """
    try:
        tk = yf.Ticker(ticker)

        # Quarterly statements — yfinance returns columns = dates (newest first)
        qi  = tk.quarterly_income_stmt    # income statement
        qb  = tk.quarterly_balance_sheet  # balance sheet
        qcf = tk.quarterly_cashflow       # cash flow

        def row(df, *keys):
            """Get a row by trying multiple key names."""
            if df is None or df.empty:
                return None
            for k in keys:
                if k in df.index:
                    return df.loc[k]
            return None

        def to_list(series, divisor=1e9, decimals=2):
            """Convert pandas Series to list of rounded floats, oldest→newest."""
            if series is None:
                return []
            vals = []
            for v in reversed(series):   # reverse: yfinance is newest-first
                try:
                    vals.append(round(float(v) / divisor, decimals))
                except Exception:
                    vals.append(None)
            return vals

        def dates_list(df):
            """Quarter labels oldest→newest."""
            if df is None or df.empty:
                return []
            return [date_to_quarter(c) for c in reversed(df.columns)]

        # ── Income statement rows ──────────────────────────────
        rev_s   = row(qi, "Total Revenue")
        ebit_s  = row(qi, "EBIT", "Operating Income")
        ebitda_s= row(qi, "EBITDA")
        net_s   = row(qi, "Net Income")
        gross_s = row(qi, "Gross Profit")
        cogs_s  = row(qi, "Cost Of Revenue", "Reconciled Cost Of Revenue")
        da_s    = row(qi, "Depreciation And Amortization",
                         "Reconciled Depreciation")
        pretax_s= row(qi, "Pretax Income")
        interest_s = row(qi, "Interest Expense")

        # ── Balance sheet rows ────────────────────────────────
        debt_s  = row(qb, "Total Debt")
        cash_s  = row(qb, "Cash And Cash Equivalents",
                         "Cash Cash Equivalents And Short Term Investments")
        equity_s= row(qb, "Stockholders Equity", "Common Stock Equity")
        assets_s= row(qb, "Total Assets")

        # ── Cash flow rows ────────────────────────────────────
        cfo_s   = row(qcf, "Operating Cash Flow",
                          "Cash Flow From Continuing Operating Activities")
        capex_s = row(qcf, "Capital Expenditure")

        # Quarter labels (from income stmt — most complete)
        labels  = dates_list(qi) or dates_list(qb) or dates_list(qcf)

        # ── Derived series (element-wise) ─────────────────────
        rev_l    = to_list(rev_s)
        ebit_l   = to_list(ebit_s)
        ebitda_l = to_list(ebitda_s)
        net_l    = to_list(net_s)
        gross_l  = to_list(gross_s)
        cogs_l   = to_list(cogs_s)
        da_l     = to_list(da_s)
        pretax_l = to_list(pretax_s)
        interest_l = to_list(interest_s)
        debt_l   = to_list(debt_s)
        cash_l   = to_list(cash_s)
        equity_l = to_list(equity_s)
        assets_l = to_list(assets_s)
        cfo_l    = to_list(cfo_s)
        capex_l  = to_list(capex_s)

        def safe_pct(a_list, b_list, scale=1):
            """Compute a/b*100 element-wise."""
            out = []
            for a, b in zip(a_list, b_list):
                try:
                    out.append(round(a / b * 100 * scale, 2) if (a and b and b != 0) else None)
                except Exception:
                    out.append(None)
            return out

        def safe_ratio(a_list, b_list):
            out = []
            for a, b in zip(a_list, b_list):
                try:
                    out.append(round(a / b, 2) if (a is not None and b and b != 0) else None)
                except Exception:
                    out.append(None)
            return out

        def safe_sub(a_list, b_list):
            return [round(a - b, 2) if (a is not None and b is not None) else None
                    for a, b in zip(a_list, b_list)]

        def safe_add(a_list, b_list):
            return [round(a + b, 2) if (a is not None and b is not None) else None
                    for a, b in zip(a_list, b_list)]

        # FCF = CFO + Capex (capex is negative in yfinance)
        fcf_l = safe_add(cfo_l, capex_l)

        # Net debt = debt - cash
        net_debt_l = safe_sub(debt_l, cash_l)

        # Margins (%)
        gross_mgn_l  = safe_pct(gross_l,  rev_l)
        op_mgn_l     = safe_pct(ebit_l,   rev_l)
        net_mgn_l    = safe_pct(net_l,    rev_l)
        pretax_mgn_l = safe_pct(pretax_l, rev_l)

        # Interest coverage = EBIT / |interest|
        int_cov_l = []
        for e, i in zip(ebit_l, interest_l):
            try:
                int_cov_l.append(round(e / abs(i), 2) if (e is not None and i and i != 0) else None)
            except Exception:
                int_cov_l.append(None)

        # Debt/EBITDA
        dEbitda_l = safe_ratio(net_debt_l, ebitda_l)

        # ROE = Net Income / Equity
        roe_l = safe_pct(net_l, equity_l)

        # D/E = Debt / Equity
        de_l = safe_ratio(debt_l, equity_l)

        # ROIC = NOPAT / (net_debt + equity)
        nopat_l = [round(e * 0.79, 2) if e is not None else None for e in ebit_l]
        cap_inv_l = safe_add(net_debt_l, equity_l)
        roic_l = safe_pct(nopat_l, cap_inv_l)

        return {
            "source":     "Yahoo Finance (yfinance)",
            "ticker":     ticker,
            "quarters":   labels[-8:],   # keep last 8
            "updated":    datetime.utcnow().isoformat(),

            # Revenue & profitability ($B)
            "revenue":    rev_l[-8:]    if rev_l    else [],
            "gross_profit": gross_l[-8:] if gross_l else [],
            "ebit":       ebit_l[-8:]   if ebit_l   else [],
            "ebitda":     ebitda_l[-8:] if ebitda_l else [],
            "net_income": net_l[-8:]    if net_l    else [],
            "pretax":     pretax_l[-8:] if pretax_l else [],

            # Cash flow ($B)
            "cfo":        cfo_l[-8:]    if cfo_l    else [],
            "capex":      capex_l[-8:]  if capex_l  else [],
            "fcf":        fcf_l[-8:]    if fcf_l    else [],

            # Balance sheet ($B)
            "total_debt": debt_l[-8:]   if debt_l   else [],
            "cash":       cash_l[-8:]   if cash_l   else [],
            "net_debt":   net_debt_l[-8:] if net_debt_l else [],
            "equity":     equity_l[-8:] if equity_l else [],
            "total_assets": assets_l[-8:] if assets_l else [],

            # Margins (%)
            "gross_mgn":  gross_mgn_l[-8:]  if gross_mgn_l  else [],
            "op_mgn":     op_mgn_l[-8:]     if op_mgn_l     else [],
            "net_mgn":    net_mgn_l[-8:]    if net_mgn_l    else [],
            "pretax_mgn": pretax_mgn_l[-8:] if pretax_mgn_l else [],

            # Ratios
            "roic":       roic_l[-8:]   if roic_l   else [],
            "roe":        roe_l[-8:]    if roe_l    else [],
            "de":         de_l[-8:]     if de_l     else [],
            "int_cov":    int_cov_l[-8:] if int_cov_l else [],
            "dEbitda":    dEbitda_l[-8:] if dEbitda_l else [],
            "interest":   interest_l[-8:] if interest_l else [],
            "d_and_a":    da_l[-8:]     if da_l     else [],
        }

    except Exception as e:
        logger.error(f"quarterly_yf failed for {ticker}: {e}", exc_info=True)
        return {"error": str(e), "source": "yfinance", "ticker": ticker}


# ─── FMP quarterly (cleaner, more complete) ───────────────────
def fetch_quarterly_fmp(ticker: str) -> dict:
    """
    Fetch quarterly financials from Financial Modeling Prep.
    Free tier: 250 requests/day. Key: https://financialmodelingprep.com
    Returns same schema as fetch_quarterly_yf for easy swapping.
    """
    if not FMP_KEY or FMP_KEY == "your_fmp_key_here":
        return {"error": "FMP_API_KEY not set", "source": "fmp"}

    BASE = "https://financialmodelingprep.com/api/v3"
    headers = {}

    def fmp_get(endpoint: str) -> list:
        try:
            r = requests.get(
                f"{BASE}/{endpoint}",
                params={"apikey": FMP_KEY, "limit": 8},
                timeout=10,
                headers=headers
            )
            r.raise_for_status()
            return r.json()
        except Exception as ex:
            logger.warning(f"FMP {endpoint}: {ex}")
            return []

    try:
        income  = fmp_get(f"income-statement/{ticker}?period=quarter")
        balance = fmp_get(f"balance-sheet-statement/{ticker}?period=quarter")
        cashflow= fmp_get(f"cash-flow-statement/{ticker}?period=quarter")
        # Earnings (actual vs estimated EPS)
        earnings= fmp_get(f"earnings/{ticker}")

        if not income:
            return {"error": "no FMP income data", "source": "fmp"}

        def col(data: list, key: str, divisor=1e9, dec=2) -> list:
            """Extract a column oldest→newest, divide by divisor."""
            vals = []
            for row in reversed(data[:8]):
                try:
                    v = row.get(key)
                    vals.append(round(float(v) / divisor, dec) if v is not None else None)
                except Exception:
                    vals.append(None)
            return vals

        def col_pct(data: list, key: str) -> list:
            vals = []
            for row in reversed(data[:8]):
                try:
                    v = row.get(key)
                    vals.append(round(float(v) * 100, 2) if v is not None else None)
                except Exception:
                    vals.append(None)
            return vals

        def col_raw(data: list, key: str, dec=2) -> list:
            vals = []
            for row in reversed(data[:8]):
                try:
                    v = row.get(key)
                    vals.append(round(float(v), dec) if v is not None else None)
                except Exception:
                    vals.append(None)
            return vals

        labels = [
            date_to_quarter(row.get("date", ""))
            for row in reversed(income[:8])
        ]

        rev_l    = col(income,  "revenue")
        gp_l     = col(income,  "grossProfit")
        ebit_l   = col(income,  "operatingIncome")
        ebitda_l = col(income,  "ebitda")
        net_l    = col(income,  "netIncome")
        pretax_l = col(income,  "incomeBeforeTax")
        int_l    = col(income,  "interestExpense")
        da_l     = col(income,  "depreciationAndAmortization")

        debt_l   = col(balance, "totalDebt")
        cash_l   = col(balance, "cashAndCashEquivalents")
        equity_l = col(balance, "totalStockholdersEquity")
        assets_l = col(balance, "totalAssets")

        cfo_l    = col(cashflow,"operatingCashFlow")
        capex_l  = col(cashflow,"capitalExpenditure")

        # Derived
        fcf_l    = [round(c + k, 2) if (c is not None and k is not None) else None
                    for c, k in zip(cfo_l, capex_l)]
        net_debt_l = [round(d - c, 2) if (d is not None and c is not None) else None
                      for d, c in zip(debt_l, cash_l)]

        # Margins directly from FMP (already %)
        gm_l    = col_pct(income, "grossProfitRatio")
        om_l    = col_pct(income, "operatingIncomeRatio")
        nm_l    = col_pct(income, "netIncomeRatio")

        # Ratios
        roe_l   = [round(n / e * 100, 2) if (n is not None and e and e != 0) else None
                   for n, e in zip(net_l, equity_l)]
        de_l    = [round(d / e, 2) if (d is not None and e and e != 0) else None
                   for d, e in zip(debt_l, equity_l)]
        int_cov_l = [round(eb / abs(i), 2) if (eb is not None and i and i != 0) else None
                     for eb, i in zip(ebit_l, int_l)]
        dEbitda_l = [round(nd / eb, 2) if (nd is not None and eb and eb != 0) else None
                     for nd, eb in zip(net_debt_l, ebitda_l)]
        nopat_l   = [round(e * 0.79, 2) if e is not None else None for e in ebit_l]
        cap_inv_l = [round(nd + eq, 2) if (nd is not None and eq is not None) else None
                     for nd, eq in zip(net_debt_l, equity_l)]
        roic_l    = [round(n / c * 100, 2) if (n is not None and c and c != 0) else None
                     for n, c in zip(nopat_l, cap_inv_l)]

        # Earnings surprise (actual EPS vs estimated EPS)
        earnings_out = []
        for e in reversed(earnings[:8]):
            try:
                earnings_out.append({
                    "date":       e.get("date", ""),
                    "quarter":    date_to_quarter(e.get("date", "")),
                    "actual_eps": e.get("actualEarningResult"),
                    "est_eps":    e.get("estimatedEarning"),
                    "surprise":   round(
                        (e["actualEarningResult"] - e["estimatedEarning"]) / abs(e["estimatedEarning"]) * 100, 2
                    ) if e.get("actualEarningResult") and e.get("estimatedEarning") else None
                })
            except Exception:
                pass

        return {
            "source":       "Financial Modeling Prep (FMP)",
            "ticker":       ticker,
            "quarters":     labels,
            "updated":      datetime.utcnow().isoformat(),

            "revenue":      rev_l,
            "gross_profit": gp_l,
            "ebit":         ebit_l,
            "ebitda":       ebitda_l,
            "net_income":   net_l,
            "pretax":       pretax_l,

            "cfo":          cfo_l,
            "capex":        capex_l,
            "fcf":          fcf_l,

            "total_debt":   debt_l,
            "cash":         cash_l,
            "net_debt":     net_debt_l,
            "equity":       equity_l,
            "total_assets": assets_l,

            "gross_mgn":    gm_l,
            "op_mgn":       om_l,
            "net_mgn":      nm_l,
            "pretax_mgn":   [round(p / r * 100, 2) if (p is not None and r and r != 0) else None
                             for p, r in zip(pretax_l, rev_l)],

            "roic":         roic_l,
            "roe":          roe_l,
            "de":           de_l,
            "int_cov":      int_cov_l,
            "dEbitda":      dEbitda_l,
            "interest":     int_l,
            "d_and_a":      da_l,

            # BONUS: earnings surprise history
            "earnings_history": earnings_out,
        }

    except Exception as e:
        logger.error(f"quarterly_fmp failed for {ticker}: {e}", exc_info=True)
        return {"error": str(e), "source": "fmp"}


# ─── Main entry point: try FMP first, fallback to yfinance ────
def fetch_quarterly(ticker: str) -> dict:
    """
    Get quarterly financial data.
    Priority: FMP (cleaner, has EPS surprise) → yfinance (free, no key)
    """
    if FMP_KEY and FMP_KEY not in ("your_fmp_key_here", ""):
        logger.info(f"Fetching quarterly (FMP): {ticker}")
        result = fetch_quarterly_fmp(ticker)
        if "error" not in result and result.get("revenue"):
            return result
        logger.warning(f"FMP failed for {ticker}, falling back to yfinance")

    logger.info(f"Fetching quarterly (yfinance): {ticker}")
    return fetch_quarterly_yf(ticker)


# ─── Next earnings date ───────────────────────────────────────
def fetch_next_earnings(ticker: str) -> dict:
    """Get next earnings date from yfinance (free) or FMP."""
    # yfinance
    try:
        tk = yf.Ticker(ticker)
        cal = tk.calendar
        if cal is not None and not cal.empty:
            # calendar is a DataFrame with columns = dates
            if "Earnings Date" in cal.index:
                dates = cal.loc["Earnings Date"].values
                if len(dates) > 0:
                    return {
                        "next_earnings": str(dates[0])[:10],
                        "source": "Yahoo Finance"
                    }
    except Exception as e:
        logger.warning(f"yfinance earnings date for {ticker}: {e}")

    # FMP fallback
    if FMP_KEY and FMP_KEY not in ("your_fmp_key_here", ""):
        try:
            r = requests.get(
                f"https://financialmodelingprep.com/api/v3/earning_calendar",
                params={"apikey": FMP_KEY, "symbol": ticker},
                timeout=8
            )
            data = r.json()
            if data and isinstance(data, list) and data[0].get("date"):
                return {
                    "next_earnings": data[0]["date"],
                    "source": "FMP"
                }
        except Exception as e:
            logger.warning(f"FMP earnings calendar for {ticker}: {e}")

    return {"next_earnings": None, "source": "not available"}
