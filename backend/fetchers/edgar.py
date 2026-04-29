# fetchers/edgar.py
# Source: SEC EDGAR — official US filings, free, no API key
# Fetches: EPS, Revenue, Net Income from 10-Q / 10-K filings
# Complements yfinance fundamentals with official SEC numbers

import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

EDGAR_HEADERS = {
    "User-Agent": "Termimal contact@termimal.local",  # required by SEC
    "Accept-Encoding": "gzip, deflate",
}

EDGAR_COMPANY_SEARCH = "https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&dateRange=custom&startdt=2020-01-01&forms=10-K,10-Q"
EDGAR_SUBMISSIONS    = "https://data.sec.gov/submissions/CIK{cik:010d}.json"
EDGAR_CONCEPT        = "https://data.sec.gov/api/xbrl/companyconcept/CIK{cik:010d}/us-gaap/{concept}.json"
EDGAR_TICKER_MAP     = "https://www.sec.gov/files/company_tickers.json"

# Cache the ticker→CIK mapping in memory
_ticker_cik_map: dict = {}


def load_ticker_cik_map() -> dict:
    """Load the full ticker→CIK mapping from SEC EDGAR."""
    global _ticker_cik_map
    if _ticker_cik_map:
        return _ticker_cik_map
    try:
        resp = requests.get(EDGAR_TICKER_MAP, headers=EDGAR_HEADERS, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        _ticker_cik_map = {
            v["ticker"].upper(): v["cik_str"]
            for v in data.values()
        }
        logger.info(f"EDGAR: loaded {len(_ticker_cik_map)} ticker→CIK mappings")
        return _ticker_cik_map
    except Exception as e:
        logger.error(f"EDGAR ticker map failed: {e}")
        return {}


def get_cik(ticker: str) -> int | None:
    """Get CIK number for a ticker symbol."""
    mapping = load_ticker_cik_map()
    cik_str = mapping.get(ticker.upper())
    return int(cik_str) if cik_str else None


def fetch_concept_history(cik: int, concept: str, unit: str = "USD") -> list[dict]:
    """
    Fetch historical values for one XBRL concept from SEC EDGAR.
    Returns list of {period, value, form, filed} sorted by date.
    """
    try:
        url = EDGAR_CONCEPT.format(cik=cik, concept=concept)
        resp = requests.get(url, headers=EDGAR_HEADERS, timeout=15)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        data = resp.json()

        units = data.get("units", {})
        entries = units.get(unit, units.get("shares", []))

        # Filter for annual (10-K) and quarterly (10-Q) forms only
        results = []
        seen = set()
        for e in entries:
            form = e.get("form", "")
            if form not in ("10-K", "10-Q"):
                continue
            key = (e.get("end"), form)
            if key in seen:
                continue
            seen.add(key)
            results.append({
                "end":    e.get("end"),
                "val":    e.get("val"),
                "form":   form,
                "filed":  e.get("filed"),
                "fp":     e.get("fp"),    # fiscal period: Q1/Q2/Q3/FY
            })

        results.sort(key=lambda x: x["end"] or "", reverse=True)
        return results

    except Exception as e:
        logger.warning(f"EDGAR concept {concept} for CIK {cik}: {e}")
        return []


def fetch_edgar_fundamentals(ticker: str) -> dict:
    """
    Fetch official SEC EDGAR fundamentals for a US ticker.
    Returns annual + quarterly history for key metrics.
    Labels: Data Quality = HIGH (official filing)
    """
    cik = get_cik(ticker)
    if not cik:
        return {
            "ticker": ticker,
            "error": "CIK not found — may be non-US or delisted",
            "data_quality": "NOT AVAILABLE"
        }

    logger.info(f"EDGAR: fetching {ticker} (CIK {cik})")

    # Key XBRL concepts to fetch
    concepts = {
        "revenue":      "Revenues",                          # or RevenueFromContractWithCustomerExcludingAssessedTax
        "net_income":   "NetIncomeLoss",
        "eps_basic":    "EarningsPerShareBasic",
        "eps_diluted":  "EarningsPerShareDiluted",
        "total_assets": "Assets",
        "total_debt":   "LongTermDebt",
        "equity":       "StockholdersEquity",
        "cfo":          "NetCashProvidedByUsedInOperatingActivities",
        "capex":        "PaymentsToAcquirePropertyPlantAndEquipment",
        "gross_profit": "GrossProfit",
        "op_income":    "OperatingIncomeLoss",
        "ebit":         "OperatingIncomeLoss",  # closest proxy
        "interest":     "InterestExpense",
        "shares":       "CommonStockSharesOutstanding",
    }

    fetched = {}
    for key, concept in concepts.items():
        data = fetch_concept_history(cik, concept)

        # Try alternate concept names if primary fails
        if not data and key == "revenue":
            data = fetch_concept_history(cik, "RevenueFromContractWithCustomerExcludingAssessedTax")
        if not data and key == "total_debt":
            data = fetch_concept_history(cik, "DebtAndCapitalLeaseObligations")

        fetched[key] = data

    # ── Build annual history (last 5 years from 10-K) ────────
    def get_annual(key, scale=1e9, round_digits=1):
        items = [x for x in fetched.get(key, []) if x["form"] == "10-K"]
        items = items[:5]  # last 5 annual filings
        vals = []
        for item in reversed(items):
            v = item.get("val")
            vals.append(round(v / scale, round_digits) if v is not None else None)
        return vals

    def get_latest_annual(key, scale=1):
        items = [x for x in fetched.get(key, []) if x["form"] == "10-K"]
        if not items:
            return None
        v = items[0].get("val")
        return round(v / scale, 2) if v is not None else None

    def get_latest_quarterly(key, scale=1):
        items = [x for x in fetched.get(key, []) if x["form"] == "10-Q"]
        if not items:
            return None
        v = items[0].get("val")
        return round(v / scale, 2) if v is not None else None

    rev_annual     = get_annual("revenue")
    ni_annual      = get_annual("net_income")
    gross_annual   = get_annual("gross_profit")
    cfo_annual     = get_annual("cfo")
    capex_annual   = get_annual("capex")

    # FCF history = CFO + CAPEX (capex is negative in EDGAR)
    fcf_annual = []
    for c, cx in zip(
        [x.get("val") for x in [i for i in fetched.get("cfo",[]) if i["form"]=="10-K"][:5]][::-1],
        [x.get("val") for x in [i for i in fetched.get("capex",[]) if i["form"]=="10-K"][:5]][::-1]
    ):
        if c is not None and cx is not None:
            fcf_annual.append(round((c + cx) / 1e9, 1))
        else:
            fcf_annual.append(None)

    # Latest TTM values
    rev_ttm   = get_latest_annual("revenue", scale=1e9)
    ni_ttm    = get_latest_annual("net_income", scale=1e9)
    eps_ttm   = get_latest_annual("eps_diluted", scale=1)
    cfo_ttm   = get_latest_annual("cfo", scale=1e9)
    equity    = get_latest_annual("equity", scale=1e9)
    op_inc    = get_latest_annual("op_income", scale=1e9)
    interest  = get_latest_annual("interest", scale=1e6)  # millions
    gross_p   = get_latest_annual("gross_profit", scale=1e9)

    # Quarterly EPS (last 8 quarters)
    eps_q = []
    for item in [x for x in fetched.get("eps_diluted",[]) if x["form"]=="10-Q"][:8]:
        v = item.get("val")
        eps_q.append({
            "period": item.get("end", ""),
            "eps": round(v, 2) if v else None,
            "filed": item.get("filed", "")
        })

    # Latest filing date
    latest_filing = None
    for key in ["revenue", "net_income"]:
        items = fetched.get(key, [])
        if items:
            latest_filing = items[0].get("filed")
            break

    return {
        "ticker":   ticker,
        "cik":      cik,

        # Annual history arrays (5 years, oldest→newest)
        "rev_hist_edgar":   rev_annual,
        "ni_hist_edgar":    ni_annual,
        "fcf_hist_edgar":   fcf_annual,
        "cfo_hist_edgar":   cfo_annual,
        "gross_hist_edgar": gross_annual,

        # TTM / latest values
        "rev_edgar":    rev_ttm,
        "ni_edgar":     ni_ttm,
        "eps_edgar":    eps_ttm,
        "cfo_edgar":    cfo_ttm,

        # Quarterly EPS
        "eps_quarterly": eps_q,

        # Latest filing
        "latest_filing": latest_filing,

        "data_quality": "HIGH",  # official SEC filing
        "source":  "SEC EDGAR (official 10-K/10-Q filings)",
        "updated": datetime.utcnow().isoformat()
    }
