# fetchers/cot.py
# Source: CFTC Public Reporting API (Socrata) — official, free, no key
# Two report types:
#   1. Traders in Financial Futures (TFF) — S&P, NASDAQ, T-Notes, VIX, Euro FX
#   2. Disaggregated Futures — WTI Crude, Gold, USD Index (commodities)

import requests
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════
# CFTC API ENDPOINTS — try multiple domains
# ═══════════════════════════════════════════════════════════

TFF_URLS = [
    "https://publicreporting.cftc.gov/resource/gpe5-46if.json",
    "https://data.cftc.gov/resource/gpe5-46if.json",
]

DISAGG_URLS = [
    "https://publicreporting.cftc.gov/resource/72hh-3qpy.json",
    "https://data.cftc.gov/resource/72hh-3qpy.json",
]

HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Termimal/1.0 (Financial Analysis Tool)",
}

# ═══════════════════════════════════════════════════════════
# CONTRACT DEFINITIONS
# ═══════════════════════════════════════════════════════════

TFF_CONTRACTS = {
    "S&P 500":    {"search": ["E-MINI S&P 500", "S&P 500 STOCK INDEX"], "report": "tff"},
    "NASDAQ-100": {"search": ["NASDAQ-100", "E-MINI NASDAQ"],           "report": "tff"},
    "10Y T-Note": {"search": ["10-YEAR", "10 YEAR", "10-YR"],          "report": "tff"},
    "VIX":        {"search": ["VIX"],                                   "report": "tff"},
    "Euro FX":    {"search": ["EURO FX"],                               "report": "tff"},
    "Japanese Yen": {"search": ["JAPANESE YEN"],                        "report": "tff"},
}

DISAGG_CONTRACTS = {
    "WTI Crude":  {"search": ["CRUDE OIL, LIGHT SWEET", "LIGHT SWEET CRUDE"], "report": "disagg"},
    "Gold":       {"search": ["GOLD"],                                         "report": "disagg"},
    "Copper":     {"search": ["COPPER"],                                       "report": "disagg"},
    "USD Index":  {"search": ["U.S. DOLLAR INDEX", "US DOLLAR INDEX"],         "report": "disagg"},
}

ALL_CONTRACTS = {**TFF_CONTRACTS, **DISAGG_CONTRACTS}

# Backward compat alias used by old COT_NAME_SEARCH references
COT_NAME_SEARCH = {k: v["search"] for k, v in ALL_CONTRACTS.items()}

# ═══════════════════════════════════════════════════════════
# FIELD MAPPINGS
# ═══════════════════════════════════════════════════════════

TFF_FIELDS = {
    "cat1": {"name": "Dealer",          "long": "dealer_positions_long",     "short": "dealer_positions_short",     "chg_long": "change_in_dealer_long",    "chg_short": "change_in_dealer_short"},
    "cat2": {"name": "Asset Manager",    "long": "asset_mgr_positions_long",  "short": "asset_mgr_positions_short",  "chg_long": "change_in_asset_mgr_long", "chg_short": "change_in_asset_mgr_short"},
    "cat3": {"name": "Leveraged",        "long": "lev_money_positions_long",  "short": "lev_money_positions_short",  "chg_long": "change_in_lev_money_long", "chg_short": "change_in_lev_money_short"},
    "cat4": {"name": "Other Reportable", "long": "other_rept_positions_long", "short": "other_rept_positions_short", "chg_long": "change_in_other_rept_long","chg_short": "change_in_other_rept_short"},
}

DISAGG_FIELDS = {
    "cat1": {"name": "Producer/Merchant","long": "prod_merc_positions_long",  "short": "prod_merc_positions_short",  "chg_long": "change_in_prod_merc_long", "chg_short": "change_in_prod_merc_short"},
    "cat2": {"name": "Swap Dealer",      "long": "swap_positions_long",       "short": "swap__positions_short",      "chg_long": "change_in_swap_long",      "chg_short": "change_in_swap_short"},
    "cat3": {"name": "Managed Money",    "long": "m_money_positions_long",    "short": "m_money_positions_short",    "chg_long": "change_in_m_money_long",   "chg_short": "change_in_m_money_short"},
    "cat4": {"name": "Other Reportable", "long": "other_rept_positions_long", "short": "other_rept_positions_short", "chg_long": "change_in_other_rept_long","chg_short": "change_in_other_rept_short"},
}


def _safe_int(val) -> int:
    try:
        return int(float(val or 0))
    except (ValueError, TypeError):
        return 0


def _extract_categories(row: dict, fields: dict) -> dict:
    cats = {}
    for key, f in fields.items():
        long_v  = _safe_int(row.get(f["long"], 0))
        short_v = _safe_int(row.get(f["short"], 0))
        chg_l   = _safe_int(row.get(f["chg_long"], 0))
        chg_s   = _safe_int(row.get(f["chg_short"], 0))
        cats[key] = {
            "name":     f["name"],
            "long":     long_v,
            "short":    short_v,
            "net":      long_v - short_v,
            "chg":      chg_l - chg_s,
            "chg_long": chg_l,
            "chg_short":chg_s,
        }
    return cats


def _match_contract(rows: list, search_terms: list) -> dict | None:
    for row in rows:
        name_field = row.get("market_and_exchange_names", "").upper()
        if any(term.upper() in name_field for term in search_terms):
            return row
    return None


def _compute_signal(cats: dict, report_type: str) -> str:
    if report_type == "tff":
        am_net = cats["cat2"]["net"]
        lm_net = cats["cat3"]["net"]
        if am_net > 0 and lm_net < 0:
            return "BUY"
        elif am_net < 0 and lm_net > 0:
            return "SELL"
        return "MIXED"
    else:
        mm_net = cats["cat3"]["net"]
        pm_net = cats["cat1"]["net"]
        if mm_net > 0 and pm_net < 0:
            return "BULLISH"
        elif mm_net < 0 and pm_net > 0:
            return "BEARISH"
        return "MIXED"



# ═══════════════════════════════════════════════════════════
# MAIN FETCH
# ═══════════════════════════════════════════════════════════

def fetch_cot_data(report_date: str = None, weeks_history: int = 1) -> list[dict]:
    """Fetch COT data for ALL contracts (financial + commodity)."""
    results = []

    tff_results = _fetch_report(TFF_URLS, TFF_CONTRACTS, TFF_FIELDS, "tff", report_date, weeks_history)
    results.extend(tff_results)

    disagg_results = _fetch_report(DISAGG_URLS, DISAGG_CONTRACTS, DISAGG_FIELDS, "disagg", report_date, weeks_history)
    results.extend(disagg_results)

    # Separate valid entries from errors
    valid = [r for r in results if "error" not in r]
    errors = [r for r in results if "error" in r]

    if valid:
        logger.info(f"COT: {len(valid)} valid contracts, {len(errors)} errors")
        return results

    logger.warning(f"COT: API offline ({len(errors)} errors)")
    return errors if errors else [{"n": "COT", "error": "CFTC API is temporarily offline (503). Try again later.", "source": "CFTC"}]


def _fetch_report(api_urls, contracts, fields, report_type, report_date=None, weeks_history=1):
    params = {
        "$order": "report_date_as_yyyy_mm_dd DESC",
        "$limit": 5000,
    }

    if report_date:
        params["$where"] = f"report_date_as_yyyy_mm_dd <= '{report_date}'"
        params["$limit"] = 500
    else:
        cutoff = (datetime.today() - timedelta(weeks=max(3, weeks_history + 1))).strftime("%Y-%m-%d")
        params["$where"] = f"report_date_as_yyyy_mm_dd >= '{cutoff}'"

    # Try each URL until one works
    data = None
    last_error = None
    for url in api_urls:
        try:
            logger.info(f"COT {report_type}: trying {url}")
            resp = requests.get(url, params=params, headers=HEADERS, timeout=30)
            logger.info(f"COT {report_type}: HTTP {resp.status_code}, {len(resp.content)} bytes from {url}")

            if resp.status_code != 200:
                logger.warning(f"COT {report_type}: HTTP {resp.status_code} from {url}")
                last_error = f"HTTP {resp.status_code}"
                continue

            # Check if response is actually JSON
            ct = resp.headers.get('Content-Type', '')
            if 'json' not in ct and 'javascript' not in ct:
                preview = resp.text[:200]
                logger.warning(f"COT {report_type}: non-JSON response from {url}: {ct} — {preview}")
                last_error = f"Non-JSON response: {ct}"
                continue

            if not resp.text or resp.text.strip() == '':
                logger.warning(f"COT {report_type}: empty response from {url}")
                last_error = "Empty response"
                continue

            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                logger.info(f"COT {report_type}: got {len(data)} rows from {url}")
                break
            else:
                logger.warning(f"COT {report_type}: empty array from {url}")
                last_error = "API returned empty array"
                data = None
                continue

        except requests.exceptions.JSONDecodeError as e:
            preview = resp.text[:100] if resp else '(no response)'
            logger.error(f"COT {report_type}: JSON decode error from {url}: {e} — preview: {preview}")
            last_error = f"JSON decode error: {str(e)[:80]}"
            continue
        except requests.exceptions.ConnectionError as e:
            logger.error(f"COT {report_type}: connection error to {url}: {e}")
            last_error = f"Connection error: {str(e)[:80]}"
            continue
        except requests.exceptions.Timeout:
            logger.error(f"COT {report_type}: timeout on {url}")
            last_error = "Timeout (30s)"
            continue
        except Exception as e:
            logger.error(f"COT {report_type}: unexpected error on {url}: {type(e).__name__}: {e}")
            last_error = f"{type(e).__name__}: {str(e)[:80]}"
            continue

    if not data:
        return [{"n": f"{report_type.upper()} API Error", "report_type": report_type, "error": last_error or "All URLs failed"}]

    # Parse the data
    try:
        by_date = {}
        for row in data:
            rd = row.get("report_date_as_yyyy_mm_dd", "")[:10]
            if rd:
                by_date.setdefault(rd, []).append(row)

        sorted_dates = sorted(by_date.keys(), reverse=True)
        if not sorted_dates:
            return [{"n": f"{report_type.upper()}", "report_type": report_type, "error": "No dates in response data"}]

        latest_date = sorted_dates[0]
        latest_rows = by_date[latest_date]
        logger.info(f"COT {report_type}: latest date={latest_date}, {len(latest_rows)} contracts")

        names = set(r.get("market_and_exchange_names", "?")[:60] for r in latest_rows[:20])
        logger.info(f"COT {report_type}: available: {names}")

        results = []
        for display_name, contract_info in contracts.items():
            matched = _match_contract(latest_rows, contract_info["search"])

            if not matched:
                logger.warning(f"COT {report_type}: '{display_name}' NOT FOUND (searched: {contract_info['search']})")
                results.append({"n": display_name, "report_type": report_type, "signal": "NO DATA",
                    "error": f"Not found. Searched: {contract_info['search']}", "date": latest_date})
                continue

            try:
                cats = _extract_categories(matched, fields)
                oi = _safe_int(matched.get("open_interest_all", 0))
                signal = _compute_signal(cats, report_type)

                am_net = cats["cat2"]["net"] if report_type == "tff" else cats["cat3"]["net"]
                lm_net = cats["cat3"]["net"] if report_type == "tff" else cats["cat1"]["net"]
                am_chg = cats["cat2"]["chg"] if report_type == "tff" else cats["cat3"]["chg"]
                lm_chg = cats["cat3"]["chg"] if report_type == "tff" else cats["cat1"]["chg"]

                results.append({
                    "n": display_name, "report_type": report_type, "categories": cats,
                    "am": am_net, "amc": am_chg, "lm": lm_net, "lmc": lm_chg,
                    "am_long": cats["cat2"]["long"] if report_type == "tff" else cats["cat3"]["long"],
                    "am_short": cats["cat2"]["short"] if report_type == "tff" else cats["cat3"]["short"],
                    "lm_long": cats["cat3"]["long"] if report_type == "tff" else cats["cat1"]["long"],
                    "lm_short": cats["cat3"]["short"] if report_type == "tff" else cats["cat1"]["short"],
                    "dl_long": cats["cat1"]["long"], "dl_short": cats["cat1"]["short"], "dl_net": cats["cat1"]["net"],
                    "or_long": cats["cat4"]["long"], "or_short": cats["cat4"]["short"], "or_net": cats["cat4"]["net"],
                    "oi": oi, "signal": signal, "date": latest_date,
                    "source": f"CFTC {report_type.upper()} API", "updated": datetime.utcnow().isoformat(),
                })
                logger.info(f"COT {report_type}: '{display_name}' OK — {signal}, OI={oi}")
            except Exception as pe:
                logger.error(f"COT parse error {display_name}: {pe}")
                results.append({"n": display_name, "report_type": report_type, "error": str(pe), "date": latest_date})

        return results

    except Exception as e:
        logger.error(f"COT {report_type}: parse phase error: {e}")
        return [{"n": f"{report_type.upper()} Parse Error", "report_type": report_type, "error": str(e)}]


# ═══════════════════════════════════════════════════════════
# HISTORICAL
# ═══════════════════════════════════════════════════════════

def fetch_cot_historical(contract_name: str = "S&P 500", weeks: int = 52) -> list[dict]:
    """Fetch historical COT data with all 4 categories."""
    contract_info = ALL_CONTRACTS.get(contract_name)
    if not contract_info:
        return []

    search_terms = contract_info["search"]
    report_type  = contract_info["report"]
    api_urls     = TFF_URLS if report_type == "tff" else DISAGG_URLS
    fields       = TFF_FIELDS if report_type == "tff" else DISAGG_FIELDS

    cutoff = (datetime.today() - timedelta(weeks=weeks)).strftime("%Y-%m-%d")
    name_filters = " OR ".join(f"upper(market_and_exchange_names) like '%{term.upper()}%'" for term in search_terms)

    params = {
        "$where": f"report_date_as_yyyy_mm_dd >= '{cutoff}' AND ({name_filters})",
        "$order": "report_date_as_yyyy_mm_dd ASC",
        "$limit": 5000,
    }

    for url in api_urls:
        try:
            resp = requests.get(url, params=params, headers=HEADERS, timeout=30)
            if resp.status_code != 200:
                continue
            ct = resp.headers.get('Content-Type', '')
            if 'json' not in ct or not resp.text.strip():
                continue
            data = resp.json()
            if not data:
                continue

            history = []
            for row in data:
                try:
                    cats = _extract_categories(row, fields)
                    oi   = _safe_int(row.get("open_interest_all", 0))
                    history.append({
                        "date": row.get("report_date_as_yyyy_mm_dd", "")[:10],
                        "categories": cats, "oi": oi,
                        "am_net":  cats["cat2"]["net"] if report_type == "tff" else cats["cat3"]["net"],
                        "lm_net":  cats["cat3"]["net"] if report_type == "tff" else cats["cat1"]["net"],
                        "am_long": cats["cat2"]["long"] if report_type == "tff" else cats["cat3"]["long"],
                        "am_short":cats["cat2"]["short"] if report_type == "tff" else cats["cat3"]["short"],
                        "lm_long": cats["cat3"]["long"] if report_type == "tff" else cats["cat1"]["long"],
                        "lm_short":cats["cat3"]["short"] if report_type == "tff" else cats["cat1"]["short"],
                    })
                except Exception:
                    continue
            return history

        except Exception as e:
            logger.warning(f"COT historical: {url} failed: {e}")
            continue

    logger.error("COT historical: all URLs failed")
    return []


def fetch_cot_dates() -> list[str]:
    """Fetch available COT report dates (for date picker)."""
    params = {
        "$select": "report_date_as_yyyy_mm_dd",
        "$group":  "report_date_as_yyyy_mm_dd",
        "$order":  "report_date_as_yyyy_mm_dd DESC",
        "$limit":  1200,
    }
    for url in TFF_URLS:
        try:
            logger.info(f"COT dates: trying {url}")
            resp = requests.get(url, params=params, headers=HEADERS, timeout=15)
            if resp.status_code != 200:
                continue
            ct = resp.headers.get('Content-Type', '')
            if 'json' not in ct:
                continue
            if not resp.text.strip():
                continue
            data = resp.json()
            dates = sorted(
                set(row.get("report_date_as_yyyy_mm_dd", "")[:10]
                    for row in data if row.get("report_date_as_yyyy_mm_dd")),
                reverse=True
            )
            if dates:
                logger.info(f"COT dates: got {len(dates)} dates, latest={dates[0]}")
                return dates
        except Exception as e:
            logger.warning(f"COT dates: {url} failed: {e}")
            continue
    logger.error("COT dates: all URLs failed")
    return []
