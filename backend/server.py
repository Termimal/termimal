# server.py
# FastAPI backend for Termimal
# Data layer: SQLite cache + stale-while-revalidate + background refresh
# Run: python server.py

import os
import sys
import time
import logging
import threading
import math
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
import json
import yfinance as yf
import pandas as pd

# Load .env
load_dotenv(Path(__file__).parent / ".env")
FRED_API_KEY = os.getenv("FRED_API_KEY", "")
FMP_API_KEY  = os.getenv("FMP_API_KEY",  "")
AV_API_KEY   = os.getenv("ALPHAVANTAGE_API_KEY", "")
POLYGON_KEY  = os.getenv("POLYGON_API_KEY", "")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("termimal.log", encoding="utf-8"),
    ]
)
logger = logging.getLogger(__name__)

# Import fetchers + cache
sys.path.insert(0, str(Path(__file__).parent))
from fetchers.prices     import fetch_price_snapshot, fetch_price_history, fetch_fundamentals, UNIVERSE
from fetchers.quarterly  import fetch_quarterly, fetch_next_earnings
from fetchers.macro      import fetch_macro_snapshot
from fetchers.cot        import fetch_cot_data, fetch_cot_historical, fetch_cot_dates
from fetchers.edgar      import fetch_edgar_fundamentals, load_ticker_cik_map
from fetchers.polymarket import (
    fetch_markets as fetch_poly_markets,
    analyze_market as analyze_poly_market,
    scan_top_markets as scan_poly_markets,
    enrich_signal_with_cache,
)
from cache.store         import (
    get as cache_get,
    set as cache_set,
    get_or_stale,
    get_status,
    get_all_stale_keys,
    get_db_size_mb,
)
from security import (
    load_access_token,
    load_allowed_origins,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    write_audit,
    client_ip,
    verify_supabase_jwt,
    extract_bearer,
)

app = FastAPI(
    title="Termimal API",
    description="Real market data: Yahoo Finance + FRED + CFTC + SEC EDGAR",
    version="5.0.0"
)

# ── API Token Auth ──────────────────────────────────────────────────────────
# NOTE: This is a single shared token, not real per-user auth. The roadmap is
# to replace it with JWT + Supabase / similar before charging users. Until
# then we at least: load from env, fail loudly in production if missing, and
# scrub it from any log surface.
API_TOKEN = load_access_token()

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class AccessGate(BaseHTTPMiddleware):
    """
    Two acceptable credentials, in priority order:
      1. Supabase JWT in `Authorization: Bearer <token>` (real per-user auth).
      2. Legacy shared `ACCESS_TOKEN` in `x-access-token` (dev fallback only).
    Successful Supabase verification stashes claims on request.state so route
    handlers can call `current_user(request)` to get the user_id / email.
    """
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/"):
            request.state.user = None
            request.state.user_id = None

            # 1. Try Supabase JWT
            bearer = extract_bearer(request)
            if bearer:
                claims = verify_supabase_jwt(bearer)
                if claims:
                    request.state.user = claims
                    request.state.user_id = claims.get("sub")
                    return await call_next(request)
                # Bearer present but invalid — fall through to legacy check; if
                # that also fails we deny. This prevents a stale/expired JWT
                # from blocking dev access while ACCESS_TOKEN is still valid.

            # 2. Legacy shared token
            legacy = request.headers.get("x-access-token") or bearer
            if legacy and legacy == API_TOKEN:
                return await call_next(request)

            # Deny + audit
            write_audit(
                action="auth.access_gate.denied",
                ip_address=client_ip(request),
                metadata={"path": request.url.path, "method": request.method},
            )
            return Response(
                content='{"detail":"Unauthorized"}',
                status_code=401,
                media_type="application/json",
            )
        return await call_next(request)


def current_user_id(request: Request) -> str | None:
    """Convenience accessor for route handlers."""
    return getattr(request.state, "user_id", None)


def current_user_claims(request: Request) -> dict | None:
    return getattr(request.state, "user", None)


def _clean_nan(obj):
    """Recursively replace NaN/Infinity with None so JSON serialization works."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: _clean_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_clean_nan(v) for v in obj]
    return obj


# Custom JSON response class — handles NaN values from yfinance
class SafeJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(
            _clean_nan(content),
            ensure_ascii=False,
            allow_nan=False,
            default=str,
        ).encode("utf-8")

app.router.default_response_class = SafeJSONResponse

# Allow the Electron/HTML frontend to call this API.
# NOTE: middlewares run in reverse-add order, so the LAST add_middleware
# wraps the request first. The desired pipeline is:
#   request → CORS → RateLimit → AccessGate → route handler
# Therefore add AccessGate first, then RateLimit, then CORS.
app.add_middleware(AccessGate)
app.add_middleware(
    RateLimitMiddleware,
    default_limit=120,
    default_window=10.0,
    path_limits={
        # Heavy scans / writes: tighter caps
        ("POST", "/api/polymarket/scan"): (5, 60.0),
        ("POST", "/api/polymarket/deep_scan"): (5, 60.0),
        # Per-market analysis is expensive but legitimately repeated
        ("GET",  "/api/polymarket/analyze"): (30, 60.0),
    },
)
_ALLOWED_ORIGINS = load_allowed_origins()
logger.info("CORS allowlist: %s", _ALLOWED_ORIGINS or "[empty — all cross-origin requests denied]")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=False,  # AccessGate uses headers, not cookies
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "x-access-token"],
    max_age=600,
)
# Security headers run last → wraps the response after CORS
app.add_middleware(SecurityHeadersMiddleware)


# ═══════════════════════════════════════════════════════════
# AUTH EVENT AUDIT LOG (frontend posts to this)
# ═══════════════════════════════════════════════════════════
_ALLOWED_AUTH_EVENTS = {
    "auth.login",
    "auth.login_failed",
    "auth.logout",
    "auth.signup",
    "auth.password_reset_requested",
    "auth.mfa_enrolled",
    "auth.mfa_unenrolled",
}


def _mask_email(email: str | None) -> str | None:
    if not email or "@" not in email:
        return None
    local, _, domain = email.partition("@")
    head = local[:2]
    return f"{head}{'***' if len(local) > 2 else ''}@{domain}"


class AuthEventBody(BaseModel):
    event: str
    email: str | None = None
    metadata: dict | None = None


@app.post("/api/auth/log-event")
async def log_auth_event(payload: AuthEventBody, request: Request):
    if payload.event not in _ALLOWED_AUTH_EVENTS:
        raise HTTPException(status_code=400, detail="Invalid event")
    write_audit(
        action=payload.event,
        entity_type="auth.user",
        ip_address=client_ip(request),
        metadata={"email": _mask_email(payload.email), **(payload.metadata or {})},
    )
    return {"ok": True}


# ═══════════════════════════════════════════════════════════
# GDPR ENDPOINTS — Article 20 (export) + Article 17 (delete)
# Both require a valid Supabase JWT (no legacy-token bypass).
# ═══════════════════════════════════════════════════════════
import supabase_admin  # local module


def _require_supabase_user(request: Request) -> dict:
    """Reject the legacy shared token here — these are user-scoped operations."""
    claims = current_user_claims(request)
    if not claims or not claims.get("sub"):
        raise HTTPException(status_code=401, detail="Authenticated user required")
    return claims


@app.get("/api/account/export")
async def gdpr_export_account(request: Request):
    claims = _require_supabase_user(request)
    user_id = claims["sub"]

    payload = {
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "user_id": user_id,
        "email": claims.get("email"),
        "auth": {
            "iat": claims.get("iat"),
            "exp": claims.get("exp"),
            "role": claims.get("role"),
        },
        "profile":     supabase_admin.select_user_rows("profiles",   user_id, user_id_column="id"),
        "watchlists":  supabase_admin.select_user_rows("watchlists", user_id),
        "alerts":      supabase_admin.select_user_rows("alerts",     user_id),
        "workspaces":  supabase_admin.select_user_rows("workspaces", user_id),
        "audit_logs":  supabase_admin.select_user_rows("audit_logs", user_id),
    }

    write_audit(
        action="account.export",
        user_id=user_id,
        entity_type="auth.user",
        entity_id=user_id,
        ip_address=client_ip(request),
        metadata={"size": sum(len(v) if isinstance(v, list) else 1 for v in payload.values())},
    )

    body = json.dumps(payload, default=str, ensure_ascii=False, indent=2)
    short = (user_id or "user")[:8]
    return Response(
        content=body,
        media_type="application/json; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="termimal-export-{short}-{int(time.time())}.json"',
            "Cache-Control": "no-store",
        },
    )


class DeleteAccountBody(BaseModel):
    confirmation: str


@app.post("/api/account/delete")
async def gdpr_delete_account(payload: DeleteAccountBody, request: Request):
    claims = _require_supabase_user(request)
    user_id = claims["sub"]

    if payload.confirmation != "DELETE":
        raise HTTPException(
            status_code=400,
            detail='Type "DELETE" in the confirmation field to permanently remove your account.',
        )

    # Audit BEFORE deletion so the row carries the user_id while the FK still exists.
    write_audit(
        action="account.deleted",
        user_id=user_id,
        entity_type="auth.user",
        entity_id=user_id,
        ip_address=client_ip(request),
        metadata={"reason": "user_requested", "via": "dashboard"},
    )

    ok, msg = supabase_admin.delete_auth_user(user_id)
    if not ok:
        # Reverse the audit narrative
        write_audit(
            action="account.delete_failed",
            user_id=user_id,
            ip_address=client_ip(request),
            metadata={"error": msg},
        )
        raise HTTPException(status_code=500, detail="Account deletion failed.")

    return {"ok": True}


# Track which keys are currently being refreshed (prevent duplicate work)
_refreshing: set[str] = set()
_refresh_lock = threading.Lock()


# ═══════════════════════════════════════════════════════════
# BACKGROUND REFRESH HELPERS
# ═══════════════════════════════════════════════════════════

def _bg_refresh(key: str, fetch_fn, *args, **kwargs):
    """
    Run a fetch function in a background thread and update cache.
    Skips if this key is already being refreshed.
    """
    with _refresh_lock:
        if key in _refreshing:
            logger.debug(f"BG skip (already refreshing): {key}")
            return
        _refreshing.add(key)

    def _do():
        try:
            logger.info(f"BG refresh START: {key}")
            data = fetch_fn(*args, **kwargs)
            if data and (not isinstance(data, dict) or "error" not in data):
                cache_set(key, _clean_nan(data))
                logger.info(f"BG refresh DONE: {key}")
            else:
                logger.warning(f"BG refresh returned empty/error for {key}")
        except Exception as e:
            logger.error(f"BG refresh FAILED for {key}: {e}")
        finally:
            with _refresh_lock:
                _refreshing.discard(key)

    thread = threading.Thread(target=_do, daemon=True)
    thread.start()


def _schedule_if_stale(key: str, is_fresh: bool, fetch_fn, *args, **kwargs):
    """If data is stale, schedule a background refresh."""
    if not is_fresh:
        _bg_refresh(key, fetch_fn, *args, **kwargs)


# ═══════════════════════════════════════════════════════════
# HEALTH + STATUS
# ═══════════════════════════════════════════════════════════

@app.get("/api/status")
def status():
    """Check API health + cache status + connector health."""
    return {
        "status":       "ok",
        "time":         datetime.utcnow().isoformat(),
        "fred_key":     bool(FRED_API_KEY),
        "fmp_key":      bool(FMP_API_KEY),
        "av_key":       bool(AV_API_KEY),
        "polygon_key":  bool(POLYGON_KEY),
        "cache":        get_status(),
        "cache_db_mb":  get_db_size_mb(),
        "connectors": {
            "yahoo_finance": "free, no key",
            "fred":          "key required — https://fred.stlouisfed.org/docs/api/api_key.html",
            "cftc_cot":      "free, no key",
            "sec_edgar":     "free, no key",
        }
    }


# ═══════════════════════════════════════════════════════════
# PRICES — Yahoo Finance (+ FMP fallback for gaps)
# ═══════════════════════════════════════════════════════════

@app.get("/api/prices")
def get_all_prices():
    """
    Fetch latest prices for full watchlist universe.
    Stale-while-revalidate: returns cached data instantly, refreshes in background.
    """
    key = "prices:all"
    cached, is_fresh = get_or_stale(key)

    if cached:
        # Serve immediately, refresh in background if stale
        _schedule_if_stale(key, is_fresh, _fetch_prices_with_fallback)
        return {
            "data": cached,
            "source": "cache" if is_fresh else "cache (refreshing)",
            "fresh": is_fresh
        }

    # Nothing in cache — fetch synchronously
    logger.info("No cache for prices — fetching synchronously...")
    data = _fetch_prices_with_fallback()
    cache_set(key, data)
    return {"data": data, "source": "yahoo_finance", "updated": datetime.utcnow().isoformat()}


def _fetch_prices_with_fallback() -> dict:
    """Fetch prices from yfinance, fill gaps with FMP if available."""
    data = fetch_price_snapshot(UNIVERSE)

    # Find tickers that failed
    failed = [sym for sym, d in data.items() if "error" in d]

    if failed and FMP_API_KEY and FMP_API_KEY not in ("your_fmp_key_here", ""):
        logger.info(f"FMP fallback for {len(failed)} tickers: {failed[:5]}...")
        import requests
        for sym in failed:
            try:
                r = requests.get(
                    f"https://financialmodelingprep.com/api/v3/quote/{sym}",
                    params={"apikey": FMP_API_KEY},
                    timeout=8
                )
                fmp_data = r.json()
                if fmp_data and isinstance(fmp_data, list) and len(fmp_data) > 0:
                    q = fmp_data[0]
                    data[sym] = {
                        "price": q.get("price"),
                        "prev":  q.get("previousClose"),
                        "chg":   q.get("change"),
                        "pct":   q.get("changesPercentage"),
                        "open":  q.get("open"),
                        "high":  q.get("dayHigh"),
                        "low":   q.get("dayLow"),
                        "vol":   q.get("volume", 0),
                        "date":  q.get("timestamp", ""),
                        "source": "FMP (fallback)",
                        "updated": datetime.utcnow().isoformat()
                    }
            except Exception as e:
                logger.warning(f"FMP fallback failed for {sym}: {e}")

    return data


@app.get("/api/price/{ticker}")
def get_price(ticker: str):
    """Fetch latest price for a single ticker."""
    ticker = ticker.upper()

    # Try from the full price cache first
    cached, is_fresh = get_or_stale("prices:all")
    if cached and ticker in cached:
        _schedule_if_stale("prices:all", is_fresh, _fetch_prices_with_fallback)
        return {"ticker": ticker, "data": cached[ticker], "source": "cache"}

    data = fetch_price_snapshot([ticker])
    return {"ticker": ticker, "data": data.get(ticker, {}), "source": "yahoo_finance"}


@app.get("/api/history/{ticker}")
def get_history(ticker: str, period: str = "1y", interval: str = ""):
    """
    OHLCV history for charts.
    period: 1d/5d/1mo/3mo/6mo/1y/2y/5y
    interval: auto (5m for 1d, 1h for 1mo, 1d for longer)
    """
    ticker = ticker.upper()
    cache_key = f"prices:history:{ticker}:{period}:{interval}"

    # Short-lived cache for intraday data
    intraday = period in ("1d", "5d")

    cached, is_fresh = get_or_stale(cache_key)
    # For intraday, always refetch if older than 5 min
    if cached and not intraday:
        _schedule_if_stale(cache_key, is_fresh, fetch_price_history, ticker, period, interval)
        return {"data": cached, "source": "cache" if is_fresh else "cache (refreshing)"}

    data = fetch_price_history(ticker, period, interval)
    if "error" not in data:
        cache_set(cache_key, data)
    return {"data": data, "source": "yahoo_finance"}


# ═══════════════════════════════════════════════════════════
# REGRESSION ANALYSIS — Seasonality, trend, valuation
# ═══════════════════════════════════════════════════════════

@app.get("/api/regression/{ticker}")
def get_regression(ticker: str):
    """10-year regression: seasonality, trend fit, over/undervalued, forecast."""
    import numpy as np
    from datetime import timedelta
    ticker = ticker.upper()
    cache_key = f"regression:v2:{ticker}"

    cached, is_fresh = get_or_stale(cache_key)
    # Validate cached data has full model fits (not old format with just name+r2)
    if cached and is_fresh:
        models_valid = cached.get("models") and len(cached["models"]) > 0 and "fit" in cached["models"][0]
        if models_valid:
            return SafeJSONResponse({"data": cached, "source": "cache"})
        else:
            logger.info(f"Regression: stale v1 cache for {ticker} — recomputing with full model data")

    try:
        logger.info(f"Regression: fetching 10y weekly data for {ticker}")
        tk = yf.Ticker(ticker)
        df = tk.history(period="10y", interval="1wk", auto_adjust=True)

        if df is None or df.empty:
            return SafeJSONResponse({"data": {"error": f"No data returned for {ticker}"}, "source": "yahoo_finance"})

        # Handle MultiIndex columns (yfinance 1.2+)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        if "Close" not in df.columns:
            return SafeJSONResponse({"data": {"error": f"No Close column for {ticker}"}, "source": "yahoo_finance"})

        # Clean data
        df = df.dropna(subset=["Close"])
        if len(df) < 52:
            return SafeJSONResponse({"data": {"error": f"Only {len(df)} data points, need 52+"}, "source": "yahoo_finance"})

        closes = df["Close"].values.astype(float)
        dates = [str(d.date()) for d in df.index[:len(closes)]]
        n = len(closes)
        x = np.arange(n, dtype=float)

        logger.info(f"Regression: {ticker} has {n} weekly data points")

        # ── 1. Seasonality (week-of-year average over all years) ──
        weeks = np.array([d.isocalendar()[1] for d in df.index[:n]])
        seasonal = np.zeros(53)
        seasonal_count = np.zeros(53)
        rolling_mean = np.convolve(closes, np.ones(52)/52, mode='same')
        rolling_mean[:26] = rolling_mean[26]
        rolling_mean[-26:] = rolling_mean[-27]
        for i in range(n):
            w = int(weeks[i]) - 1
            if 0 <= w < 53 and rolling_mean[i] > 0:
                seasonal[w] += (closes[i] / rolling_mean[i]) - 1
                seasonal_count[w] += 1
        seasonal_count[seasonal_count == 0] = 1
        seasonal = seasonal / seasonal_count

        # ── 2. De-seasonalize ──
        deseason = np.copy(closes)
        for i in range(n):
            w = int(weeks[i]) - 1
            if 0 <= w < 53 and (1 + seasonal[w]) != 0:
                deseason[i] = closes[i] / (1 + seasonal[w])

        # ── 3. Fit regressions ──
        current_price_raw = float(closes[-1])
        log_closes = np.log(np.maximum(deseason, 0.01))
        ss_tot = np.sum((deseason - np.mean(deseason))**2)
        if ss_tot == 0:
            ss_tot = 1  # avoid division by zero

        # Linear
        coeffs_lin = np.polyfit(x, deseason, 1)
        fit_lin = np.polyval(coeffs_lin, x)
        r2_lin = float(1 - np.sum((deseason - fit_lin)**2) / ss_tot)

        # Exponential
        coeffs_exp = np.polyfit(x, log_closes, 1)
        fit_exp = np.exp(np.polyval(coeffs_exp, x))
        r2_exp = float(1 - np.sum((deseason - fit_exp)**2) / ss_tot)

        # Logarithmic
        log_x = np.log(x + 1)
        coeffs_log = np.polyfit(log_x, deseason, 1)
        fit_log = np.polyval(coeffs_log, log_x)
        r2_log = float(1 - np.sum((deseason - fit_log)**2) / ss_tot)

        models = [
            {"name": "exponential", "r2": r2_exp, "fit": fit_exp, "coeffs": coeffs_exp.tolist()},
            {"name": "linear",      "r2": r2_lin, "fit": fit_lin, "coeffs": coeffs_lin.tolist()},
            {"name": "logarithmic", "r2": r2_log, "fit": fit_log, "coeffs": coeffs_log.tolist()},
        ]
        best = max(models, key=lambda m: m["r2"])

        # ── 4. Forecast 1 year (52 weeks) — for ALL models ──
        x_future = np.arange(n, n + 52, dtype=float)
        all_models_out = []
        for mdl in models:
            if mdl["name"] == "exponential":
                fc_raw = np.exp(np.polyval(mdl["coeffs"], x_future))
                fv = float(mdl["fit"][-1])
            elif mdl["name"] == "logarithmic":
                fc_raw = np.polyval(mdl["coeffs"], np.log(x_future + 1))
                fv = float(mdl["fit"][-1])
            else:
                fc_raw = np.polyval(mdl["coeffs"], x_future)
                fv = float(mdl["fit"][-1])
            # Re-apply seasonality to forecast
            current_week = int(weeks[-1]) if n > 0 else 1
            fc = []
            for i in range(52):
                w = (current_week - 1 + i) % 52
                val = float(fc_raw[i]) * (1 + seasonal[w])
                fc.append(round(val, 2))
            dev = ((current_price_raw - fv) / fv) * 100 if fv != 0 else 0
            all_models_out.append({
                "name": mdl["name"],
                "r2": round(mdl["r2"], 4),
                "fit": [round(float(v), 2) for v in mdl["fit"]],
                "forecast": fc,
                "fair_value": round(fv, 2),
                "deviation_pct": round(dev, 2),
            })

        # ── 5. Forecast dates ──
        forecast_dates = []
        last_date = df.index[-1]
        for i in range(52):
            fd = last_date + timedelta(weeks=i + 1)
            forecast_dates.append(str(fd.date()))

        # ── 6. Signal (based on best model) ──
        current_price_val = round(current_price_raw, 2)
        fair_value = round(float(best["fit"][-1]), 2)
        deviation_pct = ((current_price_raw - fair_value) / fair_value) * 100 if fair_value != 0 else 0

        if deviation_pct < -15:
            signal, signal_color = "STRONGLY UNDERVALUED", "#3fb950"
        elif deviation_pct < -5:
            signal, signal_color = "UNDERVALUED", "#3fb950"
        elif deviation_pct > 15:
            signal, signal_color = "STRONGLY OVERVALUED", "#f85149"
        elif deviation_pct > 5:
            signal, signal_color = "OVERVALUED", "#f85149"
        else:
            signal, signal_color = "FAIR VALUE", "#d29922"

        best_model_data = next(m for m in all_models_out if m["name"] == best["name"])
        result = {
            "ticker": ticker,
            "dates": dates,
            "closes": [round(float(v), 2) for v in closes],
            "fit": best_model_data["fit"],
            "forecast": best_model_data["forecast"],
            "forecast_dates": forecast_dates,
            "seasonality": [round(float(v) * 100, 2) for v in seasonal[:52]],
            "best_model": best["name"],
            "r2": round(best["r2"], 4),
            "models": all_models_out,
            "current_price": current_price_val,
            "fair_value": fair_value,
            "deviation_pct": round(deviation_pct, 2),
            "signal": signal,
            "signal_color": signal_color,
        }

        cache_set(cache_key, result)
        logger.info(f"Regression: {ticker} done — {best['name']} R²={best['r2']:.4f} signal={signal}")
        return SafeJSONResponse({"data": result, "source": "yahoo_finance"})

    except Exception as e:
        logger.error(f"Regression failed for {ticker}: {e}", exc_info=True)
        return SafeJSONResponse({"data": {"error": str(e)}, "source": "error"})


# ═══════════════════════════════════════════════════════════
# FUNDAMENTALS — Yahoo Finance + SEC EDGAR (+ FMP fallback)
# ═══════════════════════════════════════════════════════════

@app.get("/api/fundamentals/{ticker}")
def get_fundamentals(ticker: str, use_edgar: bool = True):
    """
    Full fundamental data for a ticker.
    Combines Yahoo Finance (fast) + SEC EDGAR (official).
    90-day TTL — fundamentals don't change often.
    """
    ticker = ticker.upper()
    cache_key = f"fundamentals:{ticker}"

    cached, is_fresh = get_or_stale(cache_key)
    if cached:
        _schedule_if_stale(cache_key, is_fresh, _fetch_full_fundamentals, ticker, use_edgar)
        return {
            "data": cached,
            "source": "cache" if is_fresh else "cache (refreshing)",
            "fresh": is_fresh
        }

    # No cache — fetch synchronously
    logger.info(f"No cache for fundamentals:{ticker} — fetching synchronously...")
    result = _fetch_full_fundamentals(ticker, use_edgar)
    cache_set(cache_key, result)
    return {"data": result, "source": "yahoo_finance+sec_edgar"}


def _fetch_full_fundamentals(ticker: str, use_edgar: bool = True) -> dict:
    """Fetch fundamentals from yfinance + EDGAR + FMP fallback for gaps."""
    # Primary: Yahoo Finance
    yf_data = fetch_fundamentals(ticker)

    # Supplement with SEC EDGAR (official filing data)
    edgar_data = {}
    if use_edgar and "error" not in yf_data:
        try:
            edgar_data = fetch_edgar_fundamentals(ticker)
        except Exception as e:
            logger.warning(f"EDGAR fetch failed for {ticker}: {e}")
            edgar_data = {"error": str(e)}

    # Merge: EDGAR wins for historical arrays when available
    result = {**yf_data}
    if edgar_data and "error" not in edgar_data:
        if edgar_data.get("rev_hist_edgar"):
            result["rev_hist"] = edgar_data["rev_hist_edgar"]
            result["rev_hist_source"] = "SEC EDGAR (10-K)"
        if edgar_data.get("fcf_hist_edgar"):
            result["fcf_hist"] = edgar_data["fcf_hist_edgar"]
        result["edgar"] = edgar_data
        result["data_quality"] = "HIGH"
    else:
        result["data_quality"] = "MEDIUM"

    # FMP fallback: fill any critical missing fields
    if FMP_API_KEY and FMP_API_KEY not in ("your_fmp_key_here", ""):
        missing_critical = (
            result.get("rev") is None or
            result.get("ebitda") is None or
            result.get("fcf") is None
        )
        if missing_critical and "error" not in result:
            try:
                import requests
                r = requests.get(
                    f"https://financialmodelingprep.com/api/v3/key-metrics-ttm/{ticker}",
                    params={"apikey": FMP_API_KEY},
                    timeout=8
                )
                fmp = r.json()
                if fmp and isinstance(fmp, list) and len(fmp) > 0:
                    km = fmp[0]
                    if result.get("rev") is None and km.get("revenuePerShareTTM"):
                        # FMP key-metrics doesn't have raw revenue, try profile
                        pass
                    if result.get("roic") is None and km.get("roicTTM"):
                        result["roic"] = round(km["roicTTM"] * 100, 2)
                    if result.get("roe") is None and km.get("roeTTM"):
                        result["roe"] = round(km["roeTTM"] * 100, 2)
                    if result.get("fcfYld") is None and km.get("freeCashFlowYieldTTM"):
                        result["fcfYld"] = round(km["freeCashFlowYieldTTM"] * 100, 2)
                    result["fmp_supplemented"] = True
                    logger.info(f"FMP filled gaps for {ticker}")
            except Exception as e:
                logger.warning(f"FMP key-metrics fallback failed for {ticker}: {e}")

    return result


# ═══════════════════════════════════════════════════════════
# QUARTERLY FINANCIALS — yfinance (free) + FMP (key optional)
# ═══════════════════════════════════════════════════════════

@app.get("/api/quarterly/{ticker}")
def get_quarterly(ticker: str):
    """
    Real quarterly financial statements for last 8 quarters.
    90-day TTL — only changes on earnings release.
    """
    ticker = ticker.upper()
    cache_key = f"quarterly:{ticker}"

    cached, is_fresh = get_or_stale(cache_key)
    if cached:
        _schedule_if_stale(cache_key, is_fresh, fetch_quarterly, ticker)
        return {
            "data": cached,
            "source": "cache" if is_fresh else "cache (refreshing)",
            "cached_at": cached.get("updated")
        }

    logger.info(f"No cache for quarterly:{ticker} — fetching synchronously...")
    data = fetch_quarterly(ticker)

    if "error" not in data and data.get("quarters"):
        cache_set(cache_key, data)
        logger.info(f"Quarterly data cached for {ticker}: "
                    f"{len(data['quarters'])} quarters via {data.get('source')}")
    else:
        logger.warning(f"Quarterly fetch failed for {ticker}: {data.get('error')}")

    return {"data": data, "source": data.get("source", "unknown")}


@app.get("/api/earnings/{ticker}")
def get_earnings(ticker: str):
    """
    Next earnings date + historical EPS actual vs estimated.
    7-day TTL.
    """
    ticker = ticker.upper()
    cache_key = f"earnings:{ticker}"

    cached, is_fresh = get_or_stale(cache_key)
    if cached:
        _schedule_if_stale(cache_key, is_fresh, fetch_next_earnings, ticker)
        return {"data": cached, "source": "cache" if is_fresh else "cache (refreshing)"}

    logger.info(f"Fetching earnings for {ticker}...")
    data = fetch_next_earnings(ticker)
    if data.get("next_earnings"):
        cache_set(cache_key, data)

    return {"data": data, "source": data.get("source", "yfinance")}


# ═══════════════════════════════════════════════════════════
# MACRO — FRED + Yahoo Finance
# ═══════════════════════════════════════════════════════════

@app.get("/api/macro")
def get_macro():
    """
    Full macro snapshot. 1-day TTL with stale-while-revalidate.
    """
    key = "macro:snapshot"
    cached, is_fresh = get_or_stale(key)

    if cached:
        _schedule_if_stale(key, is_fresh, fetch_macro_snapshot, FRED_API_KEY)
        return {
            "data": cached,
            "source": "cache" if is_fresh else "cache (refreshing)",
            "fresh": is_fresh
        }

    if not FRED_API_KEY or FRED_API_KEY == "your_fred_api_key_here":
        logger.warning("No FRED API key — macro data will use YF proxies only")

    logger.info("No cache for macro — fetching synchronously...")
    data = fetch_macro_snapshot(FRED_API_KEY)
    cache_set(key, data)
    return {"data": data, "source": "fred+yahoo_finance", "updated": datetime.utcnow().isoformat()}


# ═══════════════════════════════════════════════════════════
# INDICATORS — Individual FRED series for the Indicators page
# ═══════════════════════════════════════════════════════════

@app.get("/api/indicator/{series_id}")
def get_indicator(series_id: str):
    """Fetch a FRED series with dates and values."""
    series_id = series_id.upper()
    cache_key = f"indicator:{series_id}"

    cached, is_fresh = get_or_stale(cache_key)
    if cached and is_fresh:
        return {"data": cached, "source": "cache"}

    fred = os.getenv("FRED_API_KEY", "")
    if not fred:
        return {"data": {"error": "FRED_API_KEY not set"}, "source": "error"}

    try:
        import requests
        url = f"https://api.stlouisfed.org/fred/series/observations"
        params = {
            "series_id": series_id,
            "api_key": fred,
            "file_type": "json",
            "sort_order": "asc",
            "observation_start": "1960-01-01",  # MAX available history — FRED goes back decades for most series
        }
        resp = requests.get(url, params=params, timeout=15)
        obs = resp.json().get("observations", [])
        dates = []
        values = []
        for o in obs:
            v = o.get("value", ".")
            if v != ".":
                dates.append(o["date"])
                values.append(round(float(v), 4))

        if not values:
            return {"data": {"error": "no data"}, "source": "fred"}

        result = {
            "series_id": series_id,
            "dates": dates,
            "values": values,
            "latest": values[-1],
            "latest_date": dates[-1],
            "count": len(values),
        }
        cache_set(cache_key, result)
        return {"data": result, "source": "fred"}
    except Exception as e:
        logger.error(f"FRED indicator {series_id}: {e}")
        return {"data": {"error": str(e)}, "source": "error"}


# ═══════════════════════════════════════════════════════════
# COT — CFTC.gov
# ═══════════════════════════════════════════════════════════

@app.get("/api/cot")
def get_cot(date: str = None):
    """
    COT Report from CFTC.gov. 7-day TTL (published weekly).
    Optional date param for browsing historical weeks.
    """
    if date:
        # Historical date requested — don't cache, fetch directly
        logger.info(f"Fetching COT for specific date: {date}")
        data = fetch_cot_data(report_date=date)
        return {"data": data, "source": "cftc.gov", "date": date}

    key = "cot:latest"
    cached, is_fresh = get_or_stale(key)

    if cached:
        _schedule_if_stale(key, is_fresh, fetch_cot_data)
        return {
            "data": cached,
            "source": "cache" if is_fresh else "cache (refreshing)",
            "fresh": is_fresh
        }

    logger.info("No cache for COT — fetching synchronously...")
    data = fetch_cot_data()
    has_valid = data and isinstance(data, list) and any("error" not in d for d in data)
    if has_valid:
        cache_set(key, data)
    return SafeJSONResponse({"data": data, "source": "cftc.gov", "updated": datetime.utcnow().isoformat(), "has_valid": has_valid})


@app.get("/api/cot/refresh")
def cot_refresh():
    """Force re-fetch COT data, bypassing cache."""
    logger.info("COT: forced refresh requested")
    try:
        data = fetch_cot_data()
        valid = data and isinstance(data, list) and len(data) > 0 and "error" not in (data[0] if data else {})
        if valid:
            cache_set("cot:latest", data)
        return SafeJSONResponse({"data": data, "ok": valid, "count": len(data) if data else 0, "source": "cftc.gov (fresh)"})
    except Exception as e:
        logger.error(f"COT refresh failed: {e}")
        return SafeJSONResponse({"error": str(e), "ok": False})


@app.get("/api/cot/debug")
def cot_debug():
    """Debug: test raw CFTC API connectivity."""
    import requests as req
    results = {}
    urls = {
        "TFF_primary": "https://publicreporting.cftc.gov/resource/gpe5-46if.json",
        "TFF_fallback": "https://data.cftc.gov/resource/gpe5-46if.json",
        "DISAGG_primary": "https://publicreporting.cftc.gov/resource/72hh-3qpy.json",
        "DISAGG_fallback": "https://data.cftc.gov/resource/72hh-3qpy.json",
    }
    headers = {"Accept": "application/json", "User-Agent": "Termimal/1.0"}
    for name, url in urls.items():
        try:
            resp = req.get(url, params={"$limit": 3, "$order": "report_date_as_yyyy_mm_dd DESC"}, headers=headers, timeout=15)
            ct = resp.headers.get('Content-Type', 'unknown')
            if resp.status_code == 200 and 'json' in ct and resp.text.strip():
                data = resp.json()
                results[name] = {"status": resp.status_code, "content_type": ct, "rows": len(data),
                    "sample_fields": list(data[0].keys())[:10] if data else [],
                    "sample_name": data[0].get("market_and_exchange_names", "N/A")[:60] if data else "N/A"}
            else:
                results[name] = {"status": resp.status_code, "content_type": ct, "body_preview": resp.text[:200]}
        except Exception as e:
            results[name] = {"status": "error", "error": str(e)[:150]}
    return SafeJSONResponse(results)


@app.get("/api/cot/dates")
def get_cot_dates():
    """Available COT report dates for date picker (back to 2006)."""
    cache_key = "cot:dates"
    cached, is_fresh = get_or_stale(cache_key)
    if cached:
        return {"data": cached}

    dates = fetch_cot_dates()
    if dates:
        cache_set(cache_key, dates)
    return {"data": dates}


@app.get("/api/cot/history/{contract}")
def get_cot_history(contract: str = "S&P 500", weeks: int = 52):
    """
    Historical COT data for a specific contract.
    contract: S&P 500, NASDAQ-100, 10Y T-Note, VIX, WTI Crude, Gold, USD Index, Euro FX
    weeks: how many weeks back (default 52 = 1 year, max ~1000 = back to 2006)
    """
    cache_key = f"cot:history:{contract}:{weeks}"
    cached, is_fresh = get_or_stale(cache_key)
    if cached:
        _schedule_if_stale(cache_key, is_fresh, fetch_cot_historical, contract, weeks)
        return {"data": cached, "source": "cache" if is_fresh else "cache (refreshing)"}

    logger.info(f"Fetching COT history for {contract} ({weeks} weeks)...")
    data = fetch_cot_historical(contract, weeks)
    if data:
        cache_set(cache_key, data)
    return {"data": data, "source": "cftc.gov", "contract": contract, "weeks": weeks}


# ═══════════════════════════════════════════════════════════
# POSITIONING PRESSURE — COT-derived positioning analysis
# ═══════════════════════════════════════════════════════════

POSITIONING_INSTRUMENTS = [
    {"id": "wti",    "name": "WTI Crude Oil",   "category": "Commodity",    "cotContract": "WTI Crude",    "priceSymbol": "CL=F",     "report": "disagg"},
    {"id": "gold",   "name": "Gold",            "category": "Commodity",    "cotContract": "Gold",         "priceSymbol": "GC=F",     "report": "disagg"},
    {"id": "copper", "name": "Copper",          "category": "Commodity",    "cotContract": "Copper",       "priceSymbol": "HG=F",     "report": "disagg"},
    {"id": "spx",    "name": "S&P 500 E-mini",  "category": "Equity Index", "cotContract": "S&P 500",      "priceSymbol": "ES=F",     "report": "tff"},
    {"id": "us10y",  "name": "US 10Y Treasury",  "category": "Rates",        "cotContract": "10Y T-Note",   "priceSymbol": "ZN=F",     "report": "tff"},
    {"id": "eurusd", "name": "EURUSD",           "category": "FX",           "cotContract": "Euro FX",      "priceSymbol": "EURUSD=X", "report": "tff"},
    {"id": "usdjpy", "name": "USDJPY",           "category": "FX",           "cotContract": "Japanese Yen", "priceSymbol": "JPY=X",    "report": "tff"},
]

def _compute_positioning(instrument: dict, history: list) -> dict:
    """Compute positioning pressure metrics from COT history."""
    if not history or len(history) < 10:
        logger.warning(f"Positioning: {instrument['id']} — insufficient history ({len(history) if history else 0} weeks, need 10+)")
        return None

    # Net speculative positioning per week
    if instrument["report"] == "tff":
        nets = [h.get("am_net", 0) + h.get("lm_net", 0) for h in history]
    else:
        nets = [h.get("am_net", 0) for h in history]

    dates = [h.get("date", "") for h in history]
    ois = [h.get("oi", 0) for h in history]

    current_net = nets[-1] if nets else 0
    current_oi = ois[-1] if ois else 0

    # 3-year window for percentile/z-score (use all available, up to 156 weeks)
    window = nets[-156:] if len(nets) > 156 else nets

    # Percentile: rank of current value in window
    rank = sum(1 for v in window if v <= current_net)
    percentile = round((rank / len(window)) * 100)

    # Z-score
    mean_val = sum(window) / len(window)
    variance = sum((v - mean_val) ** 2 for v in window) / len(window)
    std_val = variance ** 0.5
    z_score = round((current_net - mean_val) / std_val, 2) if std_val > 0 else 0.0

    # Direction
    if abs(percentile) >= 75 and current_net > 0:
        direction = "Long crowded"
    elif percentile <= 25 and current_net < 0:
        direction = "Short crowded"
    elif percentile >= 75 and current_net < 0:
        # Extreme negative — also crowded (short side)
        direction = "Short crowded"
    else:
        direction = "Neutral"

    # For short-crowded, we want the percentile to reflect extremeness
    # Use the raw percentile — high percentile with negative net = short crowded at top
    # Low percentile with negative net = short crowded too
    # Simplify: use absolute positioning percentile
    abs_nets = [abs(v) for v in window]
    abs_rank = sum(1 for v in abs_nets if v <= abs(current_net))
    abs_percentile = round((abs_rank / len(abs_nets)) * 100)

    # Driver category — largest 4-week absolute net change
    driver_cat = "Unknown"
    driver_net = 0
    if len(history) >= 5:
        latest = history[-1]
        prior = history[-5] if len(history) >= 5 else history[0]
        cats = latest.get("categories", {})
        best_chg = 0
        for ck, cv in cats.items():
            cat_name = cv.get("name", "")
            cur_n = cv.get("net", 0)
            # Find same category in prior
            prior_cats = prior.get("categories", {})
            prior_n = prior_cats.get(ck, {}).get("net", 0)
            chg = abs(cur_n - prior_n)
            if chg > best_chg:
                best_chg = chg
                driver_cat = cat_name
                driver_net = cur_n

    # OI trend (4-week)
    oi_change_4w = 0.0
    oi_trend = "Flat"
    if len(ois) >= 5 and ois[-5] > 0:
        oi_change_4w = round(((ois[-1] - ois[-5]) / ois[-5]) * 100, 1)
        if oi_change_4w > 5:
            oi_trend = "Expanding"
        elif oi_change_4w < -5:
            oi_trend = "Contracting"

    # Weeks at extreme (consecutive weeks where abs_percentile >= 80)
    weeks_extreme = 0
    weekly_abs_pcts = []
    for i in range(len(window)):
        r = sum(1 for v in abs_nets if v <= abs_nets[i])
        weekly_abs_pcts.append(round((r / len(abs_nets)) * 100))
    for p in reversed(weekly_abs_pcts):
        if p >= 80:
            weeks_extreme += 1
        else:
            break

    # Weekly change
    prior_abs_pct = weekly_abs_pcts[-2] if len(weekly_abs_pcts) >= 2 else abs_percentile
    weekly_change = abs_percentile - prior_abs_pct

    # Sparkline (last 8 weekly percentiles)
    sparkline = weekly_abs_pcts[-8:] if len(weekly_abs_pcts) >= 8 else weekly_abs_pcts

    # Latest COT date
    latest_date = dates[-1] if dates else ""

    return {
        "id": instrument["id"],
        "name": instrument["name"],
        "category": instrument["category"],
        "cotContract": instrument["cotContract"],
        "percentile": abs_percentile,
        "zScore": z_score,
        "direction": direction,
        "driverCategory": driver_cat,
        "driverNet": driver_net,
        "oiTrend": oi_trend,
        "oiChange4w": oi_change_4w,
        "weeksAtExtreme": weeks_extreme,
        "weeklyChange": weekly_change,
        "latestCotDate": latest_date,
        "sparkline": sparkline,
    }


def _compute_positioning_detail(instrument: dict, history: list) -> dict:
    """Full detail computation for one instrument."""
    overview = _compute_positioning(instrument, history)
    if not overview:
        return None

    if instrument["report"] == "tff":
        nets = [h.get("am_net", 0) + h.get("lm_net", 0) for h in history]
    else:
        nets = [h.get("am_net", 0) for h in history]

    dates = [h.get("date", "") for h in history]
    ois = [h.get("oi", 0) for h in history]
    window = nets[-156:] if len(nets) > 156 else nets
    window_dates = dates[-156:] if len(dates) > 156 else dates

    # Compute percentile history for all weeks in window
    abs_nets = [abs(v) for v in window]
    pct_history = []
    for i in range(len(abs_nets)):
        r = sum(1 for v in abs_nets if v <= abs_nets[i])
        pct_history.append(round((r / len(abs_nets)) * 100))

    # Trader category breakdown from latest report
    trader_cats = []
    if history:
        latest = history[-1]
        prior_4w = history[-5] if len(history) >= 5 else history[0]
        cats = latest.get("categories", {})
        current_oi = latest.get("oi", 1) or 1
        for ck in ["cat1", "cat2", "cat3", "cat4"]:
            cv = cats.get(ck, {})
            prior_cv = prior_4w.get("categories", {}).get(ck, {})
            cat_net = cv.get("net", 0)
            cat_long = cv.get("long", 0)
            cat_short = cv.get("short", 0)
            prior_net = prior_cv.get("net", 0)
            change_4w = cat_net - prior_net
            pct_oi = round((cat_long + cat_short) / current_oi * 100, 1) if current_oi > 0 else 0
            trader_cats.append({
                "name": cv.get("name", f"Category {ck}"),
                "net": cat_net,
                "long": cat_long,
                "short": cat_short,
                "change4w": change_4w,
                "pctOI": pct_oi,
                "isDriver": cv.get("name", "") == overview["driverCategory"],
            })

    # OI details
    oi_52w = ois[-52:] if len(ois) >= 52 else ois
    oi_min = min(oi_52w) if oi_52w else 0
    oi_max = max(oi_52w) if oi_52w else 0

    # Longest recent streak above 80th percentile in past year
    longest_streak = 0
    current_streak = 0
    for p in pct_history[-52:]:
        if p >= 80:
            current_streak += 1
            longest_streak = max(longest_streak, current_streak)
        else:
            current_streak = 0

    # Historical behavior: when percentile was near current level, did price reverse?
    current_pct = overview["percentile"]
    hist_behavior = "Insufficient historical occurrences for reliable statistical context."
    if current_pct >= 75:
        # Find instances where percentile crossed above current level (within 5pp)
        instances = 0
        reversals = 0
        for i in range(len(pct_history) - 4):
            if abs(pct_history[i] - current_pct) <= 5 and pct_history[i] >= 75:
                instances += 1
                # Check if net positioning decreased in next 4 weeks
                if i + 4 < len(abs_nets):
                    if abs_nets[i + 4] < abs_nets[i]:
                        reversals += 1
        if instances >= 5:
            hit_rate = round((reversals / instances) * 100)
            hist_behavior = f"When positioning reached the {current_pct}th percentile, positioning unwound within 4 weeks in {hit_rate}% of cases (n={instances})."

    # Fetch price data
    price_history = []
    price_dates = []
    try:
        ticker = yf.Ticker(instrument["priceSymbol"])
        pdf = ticker.history(period="3y", interval="1wk")
        if pdf is not None and len(pdf) > 0:
            price_history = [round(float(v), 4) for v in pdf["Close"].tolist() if not (isinstance(v, float) and math.isnan(v))]
            price_dates = [d.strftime("%Y-%m-%d") for d in pdf.index.tolist()]
    except Exception as e:
        logger.warning(f"Price fetch for {instrument['priceSymbol']}: {e}")

    overview.update({
        "percentileHistory": pct_history,
        "percentileDates": window_dates,
        "netPositioning": window,
        "netDates": window_dates,
        "priceHistory": price_history,
        "priceDates": price_dates,
        "traderCategories": trader_cats,
        "oiCurrent": ois[-1] if ois else 0,
        "oi52wRange": [oi_min, oi_max],
        "longestRecentStreak": longest_streak,
        "historicalBehavior": hist_behavior,
        "coverageLimitation": "Regulated futures only. OTC, swaps, forwards, and options delta not captured.",
        "methodologyLabel": "COT-derived. 3-year rolling percentile. Net speculative positioning.",
    })
    return overview


@app.get("/api/positioning")
def get_positioning():
    """Positioning Pressure overview for all 7 instruments."""
    cache_key = "positioning:overview"
    cached, is_fresh = get_or_stale(cache_key)
    if cached and is_fresh:
        return {"data": cached, "source": "cache", "updated": datetime.utcnow().isoformat()}

    logger.info("Computing positioning pressure for all instruments...")
    results = []
    errors = []
    for inst in POSITIONING_INSTRUMENTS:
        try:
            logger.info(f"Positioning: fetching COT for {inst['cotContract']}...")
            history = fetch_cot_historical(inst["cotContract"], 156)
            if not history:
                reason = f"COT fetch returned empty for {inst['cotContract']}"
                logger.warning(f"Positioning: {inst['id']} — {reason}")
                errors.append({"id": inst["id"], "reason": reason})
                continue
            logger.info(f"Positioning: {inst['id']} — got {len(history)} weeks of history")
            computed = _compute_positioning(inst, history)
            if computed:
                logger.info(f"Positioning: {inst['id']} — percentile={computed['percentile']} z={computed['zScore']} direction={computed['direction']} INCLUDED")
                results.append(computed)
            else:
                reason = f"computation returned None (insufficient data)"
                logger.warning(f"Positioning: {inst['id']} — {reason}")
                errors.append({"id": inst["id"], "reason": reason})
        except Exception as e:
            logger.error(f"Positioning: {inst['id']} — EXCEPTION: {e}")
            errors.append({"id": inst["id"], "reason": str(e)})

    if results:
        cache_set(cache_key, results)

    logger.info(f"Positioning: {len(results)} instruments computed, {len(errors)} failed")
    latest_date = results[0]["latestCotDate"] if results else ""
    return {
        "data": results,
        "source": "cftc.gov",
        "updated": datetime.utcnow().isoformat(),
        "latestCotDate": latest_date,
        "computed": len(results),
        "failed": len(errors),
        "errors": errors,
    }


@app.get("/api/positioning/debug")
def positioning_debug():
    """Diagnostic endpoint — check positioning data pipeline for each instrument."""
    results = []
    for inst in POSITIONING_INSTRUMENTS:
        diag = {"id": inst["id"], "name": inst["name"], "cotContract": inst["cotContract"]}
        try:
            history = fetch_cot_historical(inst["cotContract"], 156)
            if history:
                diag["cotFetch"] = "success"
                diag["historyWeeks"] = len(history)
                diag["latestDate"] = history[-1].get("date", "?") if history else "?"
                diag["latestAmNet"] = history[-1].get("am_net", "?") if history else "?"
                diag["latestLmNet"] = history[-1].get("lm_net", "?") if history else "?"
                diag["latestOI"] = history[-1].get("oi", "?") if history else "?"
                computed = _compute_positioning(inst, history)
                if computed:
                    diag["percentile"] = computed["percentile"]
                    diag["zScore"] = computed["zScore"]
                    diag["direction"] = computed["direction"]
                    diag["included"] = True
                else:
                    diag["included"] = False
                    diag["reason"] = "computation returned None"
            else:
                diag["cotFetch"] = "failed"
                diag["historyWeeks"] = 0
                diag["included"] = False
                diag["reason"] = "COT fetch returned empty — CFTC API may be down"
        except Exception as e:
            diag["cotFetch"] = "error"
            diag["included"] = False
            diag["reason"] = str(e)
        results.append(diag)
    return {"instruments": results, "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/positioning/{instrument_id}")
def get_positioning_detail(instrument_id: str):
    """Full positioning detail for one instrument."""
    cache_key = f"positioning:detail:{instrument_id}"
    cached, is_fresh = get_or_stale(cache_key)
    if cached and is_fresh:
        return {"data": cached, "source": "cache"}

    inst = next((i for i in POSITIONING_INSTRUMENTS if i["id"] == instrument_id), None)
    if not inst:
        raise HTTPException(status_code=404, detail=f"Instrument {instrument_id} not found")

    logger.info(f"Computing positioning detail for {inst['name']}...")
    history = fetch_cot_historical(inst["cotContract"], 156)
    if not history:
        raise HTTPException(status_code=503, detail=f"No COT data available for {inst['cotContract']}. CFTC API may be unavailable.")

    result = _compute_positioning_detail(inst, history)
    if not result:
        raise HTTPException(status_code=500, detail="Computation failed — insufficient data")

    cache_set(cache_key, result)
    return {"data": result, "source": "cftc.gov"}


# ═══════════════════════════════════════════════════════════
# SEARCH — ticker universe
# ═══════════════════════════════════════════════════════════

@app.get("/api/search")
def search(q: str = ""):
    """Search ticker universe. Returns matches for autocomplete."""
    q = q.upper().strip()
    if not q:
        return {"results": []}

    results = [
        sym for sym in UNIVERSE
        if q in sym.upper()
    ][:10]

    return {"query": q, "results": results}


# ═══════════════════════════════════════════════════════════
# POLYMARKET — Real prediction market odds
# ═══════════════════════════════════════════════════════════

@app.get("/api/polymarket")
def get_polymarket():
    """
    Fetch active prediction markets from Polymarket.
    Returns events with real market-derived probabilities.
    Cached for 15 minutes.
    """
    cache_key = "polymarket:events"
    cached, is_fresh = get_or_stale(cache_key)
    if cached and is_fresh:
        return SafeJSONResponse({"data": cached, "source": "cache"})

    try:
        import requests as req
        logger.info("Fetching Polymarket events...")

        # Polymarket Gamma API — public, no auth required
        resp = req.get(
            "https://gamma-api.polymarket.com/events",
            params={"limit": 50, "active": "true", "closed": "false", "order": "volume24hr", "ascending": "false"},
            headers={"Accept": "application/json"},
            timeout=15
        )

        if resp.status_code != 200:
            logger.warning(f"Polymarket API returned {resp.status_code}")
            if cached:
                return SafeJSONResponse({"data": cached, "source": "cache (stale)"})
            return SafeJSONResponse({"data": [], "source": "error", "error": f"HTTP {resp.status_code}"})

        raw_events = resp.json()
        events = []

        for ev in raw_events:
            if not ev.get("markets"):
                continue

            # Use the FIRST market per event only (avoid duplicates like YES/NO variants)
            mkt = ev["markets"][0]
            try:
                outcome_prices = json.loads(mkt.get("outcomePrices", "[]"))
                if not outcome_prices or len(outcome_prices) < 1:
                    continue

                prob = round(float(outcome_prices[0]) * 100, 1)
                if prob <= 0.5 or prob >= 99.5:
                    continue

                volume = float(mkt.get("volume", 0) or 0)
                liquidity = float(mkt.get("liquidityNum", 0) or 0)

                # Skip low-volume junk markets (< $50k traded)
                if volume < 50000:
                    continue

                # Categorize based on keywords
                q = (mkt.get("question", "") + " " + ev.get("title", "")).lower()
                cat = "Markets"
                if any(w in q for w in ["fed", "rate cut", "rate hike", "central bank", "ecb", "boj", "boe", "fomc", "interest rate", "monetary"]):
                    cat = "Central Bank"
                elif any(w in q for w in ["recession", "gdp", "inflation", "cpi", "unemployment", "jobs", "economic", "growth", "pce", "wage"]):
                    cat = "Macro"
                elif any(w in q for w in ["war", "invasion", "sanctions", "tariff", "election", "president", "vote", "government", "geopolit", "china", "russia", "ukraine", "taiwan", "iran", "israel", "nato", "ceasefire", "military"]):
                    cat = "Geopolitical"
                elif any(w in q for w in ["regulation", "sec", "law", "bill", "act", "ban", "legal", "crypto regulation", "etf approv"]):
                    cat = "Regulatory"

                # Impact based on volume (market attention proxy)
                if volume > 5_000_000:
                    impact = "Critical"
                elif volume > 1_000_000:
                    impact = "High"
                elif volume > 200_000:
                    impact = "Medium"
                else:
                    impact = "Low"

                events.append({
                    "id": mkt.get("id", ""),
                    "name": mkt.get("question", ev.get("title", "Unknown")),
                    "category": cat,
                    "probability": prob,
                    "impact": impact,
                    "volume": round(volume, 0),
                    "liquidity": round(liquidity, 0),
                    "end_date": mkt.get("endDate", None),
                    "source": "Polymarket",
                    "url": f"https://polymarket.com/event/{ev.get('slug', '')}",
                    "active": True,
                })
            except (ValueError, IndexError, TypeError) as e:
                continue

        # Sort by volume (most traded first)
        events.sort(key=lambda e: e.get("volume", 0), reverse=True)

        # Limit to top 40
        events = events[:40]

        logger.info(f"Polymarket: fetched {len(events)} active markets")
        cache_set(cache_key, events)
        return SafeJSONResponse({"data": events, "source": "polymarket"})

    except Exception as e:
        logger.error(f"Polymarket fetch failed: {e}")
        if cached:
            return SafeJSONResponse({"data": cached, "source": "cache (stale)"})
        return SafeJSONResponse({"data": [], "source": "error", "error": str(e)})


# ═══════════════════════════════════════════════════════════
# BTC ON-CHAIN METRICS — valuation context, not trading signals
# ═══════════════════════════════════════════════════════════

@app.get("/api/btc/onchain")
def get_btc_onchain():
    """
    Bitcoin valuation metrics computed from yfinance — no API keys needed.
    """
    from fetchers.btc_onchain import fetch_btc_onchain

    cache_key = "btc:onchain"
    cached, is_fresh = get_or_stale(cache_key)

    # Only use cache if it has actual data (not a cached error)
    if cached and is_fresh and cached.get("sections") and cached.get("price_history") and len(cached.get("sections", {})) > 0:
        logger.info("BTC on-chain: serving from cache")
        return SafeJSONResponse({"data": cached, "source": "cache"})

    try:
        logger.info("BTC on-chain: computing fresh data...")
        data = fetch_btc_onchain()
        n_metrics = sum(len(s.get("metrics",[])) for s in data.get("sections",{}).values())
        logger.info(f"BTC on-chain result: {n_metrics} metrics across {len(data.get('sections',{}))} sections, error={data.get('error')}")
        if data and data.get("sections"):
            cache_set(cache_key, data)
            return SafeJSONResponse({"data": data, "source": "live"})
        elif cached:
            return SafeJSONResponse({"data": cached, "source": "cache (stale)"})
        return SafeJSONResponse({"data": data, "source": "partial"})
    except Exception as e:
        logger.error(f"BTC on-chain EXCEPTION: {e}", exc_info=True)
        if cached:
            return SafeJSONResponse({"data": cached, "source": "cache (error)"})
        return SafeJSONResponse({"data": {"error": str(e), "sections": {}}, "source": "error"})


# ═══════════════════════════════════════════════════════════
# SWING ANALYSIS — quant-based technical analysis
# ═══════════════════════════════════════════════════════════

@app.get("/api/analysis/{ticker}")
def get_analysis(ticker: str):
    """Quant swing analysis: trend, levels, volume, momentum, scenarios."""
    from fetchers.swing_analysis import analyze

    ticker = ticker.upper()
    cache_key = f"analysis:{ticker}"
    cached, is_fresh = get_or_stale(cache_key)

    if cached and is_fresh and not cached.get("error"):
        return SafeJSONResponse({"data": cached, "source": "cache"})

    try:
        data = analyze(ticker)
        if data and not data.get("error"):
            cache_set(cache_key, data)
        return SafeJSONResponse({"data": data, "source": "live"})
    except Exception as e:
        logger.error(f"Analysis failed for {ticker}: {e}")
        if cached:
            return SafeJSONResponse({"data": cached, "source": "cache (error)"})
        return SafeJSONResponse({"data": {"error": str(e)}, "source": "error"})


# ═══════════════════════════════════════════════════════════
# STOCK NEWS — from yfinance
# ═══════════════════════════════════════════════════════════

@app.get("/api/news/{ticker}")
def get_news(ticker: str):
    """Stock-specific news from yfinance."""
    ticker = ticker.upper()
    cache_key = f"news:{ticker}"
    cached, is_fresh = get_or_stale(cache_key)

    if cached and is_fresh:
        return SafeJSONResponse({"data": cached, "source": "cache"})

    try:
        tk = yf.Ticker(ticker)
        info = tk.info or {}
        company_name = info.get("longName", "") or info.get("shortName", "") or ticker
        # Extract key name words for matching (e.g. "Meta Platforms" → ["meta", "platforms"])
        name_words = [w.lower() for w in company_name.split() if len(w) > 2 and w.lower() not in ("inc", "inc.", "corp", "corp.", "ltd", "ltd.", "the", "and", "llc", "plc")]
        ticker_lower = ticker.lower().replace("-", "").replace("=x", "")

        raw_news = tk.news or []
        items = []
        for n in raw_news[:40]:  # scan more, filter down
            content = n.get("content", {}) if isinstance(n.get("content"), dict) else {}
            title = content.get("title") or n.get("title", "")
            title_lower = title.lower()

            # Check if this article is actually about this ticker
            # 1. Ticker symbol mentioned in title
            # 2. Company name word mentioned in title
            # 3. Ticker in the relatedTickers list from yfinance
            related = [t.upper() for t in (n.get("relatedTickers") or [])]
            is_relevant = (
                ticker in related or
                ticker_lower in title_lower or
                any(w in title_lower for w in name_words if len(w) > 3) or
                company_name.lower() in title_lower
            )

            if not is_relevant:
                continue

            pub_date = content.get("pubDate", "") or n.get("providerPublishTime", "")
            if isinstance(pub_date, (int, float)):
                from datetime import datetime as dt
                pub_date = dt.fromtimestamp(pub_date).strftime("%Y-%m-%d %H:%M")
            items.append({
                "title": title,
                "link": content.get("canonicalUrl", {}).get("url", "") or n.get("link", ""),
                "publisher": content.get("provider", {}).get("displayName", "") or n.get("publisher", ""),
                "date": str(pub_date)[:16] if pub_date else "",
                "type": n.get("type", ""),
            })
            if len(items) >= 15:
                break

        if items:
            cache_set(cache_key, items)
        return SafeJSONResponse({"data": items, "source": "yfinance"})
    except Exception as e:
        logger.error(f"News fetch failed for {ticker}: {e}")
        if cached:
            return SafeJSONResponse({"data": cached, "source": "cache (error)"})
        return SafeJSONResponse({"data": [], "source": "error"})


# ═══════════════════════════════════════════════════════════
# CACHE MANAGEMENT — force refresh, status
# ═══════════════════════════════════════════════════════════

@app.get("/api/cache/refresh")
def force_refresh(data_type: str = "all"):
    """
    Force refresh specific data type or all.
    data_type: prices | macro | cot | all
    """
    if data_type in ("prices", "all"):
        _bg_refresh("prices:all", _fetch_prices_with_fallback)
    if data_type in ("macro", "all"):
        _bg_refresh("macro:snapshot", fetch_macro_snapshot, FRED_API_KEY)
    if data_type in ("cot", "all"):
        _bg_refresh("cot:latest", fetch_cot_data)

    return {"status": "refresh scheduled", "type": data_type}


# ═══════════════════════════════════════════════════════════
# BACKGROUND REFRESH JOBS — for the scheduler
# ═══════════════════════════════════════════════════════════

def refresh_prices_job():
    logger.info("⏱ Scheduled: refreshing prices...")
    data = _fetch_prices_with_fallback()
    cache_set("prices:all", data)
    logger.info(f"⏱ Prices refreshed: {len(data)} tickers")

def refresh_macro_job():
    logger.info("⏱ Scheduled: refreshing macro...")
    data = fetch_macro_snapshot(FRED_API_KEY)
    cache_set("macro:snapshot", data)
    logger.info("⏱ Macro refreshed")

def refresh_cot_job():
    logger.info("⏱ Scheduled: refreshing COT...")
    data = fetch_cot_data()
    if data:
        cache_set("cot:latest", data)
    logger.info("⏱ COT refreshed")


# ═══════════════════════════════════════════════════════════
# STARTUP — instant cache read + silent background refresh
# ═══════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup():
    logger.info("=" * 60)
    logger.info("Termimal API v3.0 starting...")
    logger.info(f"  FRED key: {'✅' if FRED_API_KEY and FRED_API_KEY != 'your_fred_api_key_here' else '❌ missing'}")
    logger.info(f"  FMP key:  {'✅' if FMP_API_KEY and FMP_API_KEY != 'your_fmp_key_here' else '❌ missing (optional)'}")
    logger.info(f"  Cache DB: {get_db_size_mb()} MB")
    logger.info("=" * 60)

    # Pre-load ticker→CIK map for SEC EDGAR
    load_ticker_cik_map()

    # ── ALWAYS refresh core data on startup ─────────────────
    # Prices, macro, and COT are always fetched fresh when server starts.
    # This ensures you never see stale data after opening the terminal.
    logger.info("Startup: refreshing core data in background...")
    _bg_refresh("prices:all", _fetch_prices_with_fallback)
    _bg_refresh("macro:snapshot", fetch_macro_snapshot, FRED_API_KEY)
    _bg_refresh("cot:latest", fetch_cot_data)

    # ── Also refresh any other stale entries (fundamentals, quarterly, etc.)
    stale_keys = get_all_stale_keys()
    if stale_keys:
        logger.info(f"Found {len(stale_keys)} stale cache entries — refreshing in background...")
        for key in stale_keys:
            parts = key.split(":")
            if len(parts) >= 2:
                dtype, ticker = parts[0], parts[1]
                if dtype == "fundamentals":
                    _bg_refresh(key, _fetch_full_fundamentals, ticker, True)
                elif dtype == "quarterly":
                    _bg_refresh(key, fetch_quarterly, ticker)
                elif dtype == "earnings":
                    _bg_refresh(key, fetch_next_earnings, ticker)
                elif dtype == "prices" and parts[1] == "history" and len(parts) >= 4:
                    _bg_refresh(key, fetch_price_history, parts[2], parts[3])

    # Start periodic scheduler (prices every 5min, macro every 30min, COT weekly)
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        scheduler = AsyncIOScheduler()
        scheduler.add_job(refresh_prices_job, "interval", minutes=5,   id="prices", misfire_grace_time=60)
        scheduler.add_job(refresh_macro_job,  "interval", minutes=30,  id="macro",  misfire_grace_time=120)
        scheduler.add_job(refresh_cot_job,    "interval", hours=168,   id="cot",    misfire_grace_time=300)  # weekly
        scheduler.start()
        logger.info("✅ Scheduler started: prices 5m · macro 30m · COT 7d")
    except Exception as e:
        logger.warning(f"Scheduler failed (non-fatal, stale-while-revalidate still works): {e}")

    logger.info("✅ Termimal API ready — serving from cache, refreshing stale data silently")


# ═══════════════════════════════════════════════════════════
# POLYMARKET INTELLIGENCE
# ═══════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════
# POLYMARKET INTELLIGENCE
# ═══════════════════════════════════════════════════════════

@app.get("/api/polymarket/markets")
async def polymarket_markets():
    """All $1M+ markets (sports, politics, macro, crypto — no topic filter)."""
    cached = cache_get("polymarket:markets")
    if cached and len(cached) > 0:
        return cached
    data = await fetch_poly_markets()
    logger.info(f"/api/polymarket/markets: returning {len(data)} markets")
    if data and len(data) > 0:  # never cache empty results
        cache_set("polymarket:markets", data)
    return data

@app.get("/api/polymarket/scan")
async def polymarket_scan(limit: int = 10):
    """Full intelligence scan: wallet scoring + anomaly detection on top markets."""
    cache_key = f"polymarket:scan:{limit}"
    cached = cache_get(cache_key)
    if cached: return cached

    data = await scan_poly_markets(limit=limit)

    # Enrich strong signals with live price cross-confirmation
    prices_snapshot = cache_get("prices:all") or {}
    prices = prices_snapshot.get("prices", {}) if isinstance(prices_snapshot, dict) else {}
    for sig in data.get("strong_signals", []):
        enrich_signal_with_cache(sig, prices)

    # Persist new signals to signal history
    existing_history = cache_get("polymarket:signal_history") or []
    new_sigs = [s for s in data.get("strong_signals", []) if s]
    if new_sigs:
        combined = new_sigs + existing_history
        combined = combined[:200]  # cap history
        cache_set("polymarket:signal_history", combined)

    cache_set(cache_key, data)
    return data

@app.get("/api/polymarket/market/{market_id}")
async def polymarket_market_detail(market_id: str):
    """Full analysis for a single market."""
    key = f"polymarket:detail:{market_id}"
    cached = cache_get(key)
    if cached: return cached
    # Find market in bulk cache
    markets = cache_get("polymarket:markets") or []
    market = next((m for m in markets if m.get("id") == market_id), None)
    if not market:
        return {"error": "market not found"}
    data = await analyze_poly_market(market)
    if data: cache_set(key, data)
    return data or {}

@app.get("/api/polymarket/signals")
async def polymarket_signals():
    """Signal history log."""
    return cache_get("polymarket:signal_history") or []

@app.post("/api/polymarket/signal/{signal_id}/outcome")
async def polymarket_signal_outcome(signal_id: str, outcome: str):
    """Mark signal outcome (correct/incorrect) for performance tracking."""
    history = cache_get("polymarket:signal_history") or []
    for sig in history:
        if sig.get("signal_id") == signal_id:
            sig["outcome"] = outcome
            sig["resolved_at"] = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
    cache_set("polymarket:signal_history", history)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════
# ANALYST CONSENSUS
# ═══════════════════════════════════════════════════════════

@app.get("/api/analyst/{ticker}")
def get_analyst_consensus(ticker: str):
    """
    Analyst recommendation + 12M price target data from yfinance.
    Returns: recommendation label, strong_buy/buy/hold/sell/strong_sell counts,
             target low/median/high/mean, number of analysts, current price.
    """
    ticker = ticker.upper()
    cache_key = f"analyst:{ticker}"
    cached, is_fresh = get_or_stale(cache_key)
    if cached and is_fresh:
        return SafeJSONResponse({"data": cached, "source": "cache"})

    try:
        tk = yf.Ticker(ticker)
        info = tk.info or {}

        # Recommendation breakdown — try info dict first (most recent month rollup)
        strong_buy  = int(info.get("strongBuy")  or 0)
        buy         = int(info.get("buy")         or 0)
        hold        = int(info.get("hold")        or 0)
        sell        = int(info.get("sell")        or 0)
        strong_sell = int(info.get("strongSell")  or 0)
        total = strong_buy + buy + hold + sell + strong_sell

        # Fallback: yfinance also exposes a recommendations DataFrame with monthly
        # breakdown — period 0m, -1m, -2m, -3m, columns strongBuy/buy/hold/sell/strongSell.
        # When info dict counts are 0, try this. Use the most recent (period == "0m") row.
        if total == 0:
            try:
                recs_df = tk.recommendations
                if recs_df is not None and not recs_df.empty:
                    # The DataFrame has a 'period' column with values like "0m", "-1m", "-2m", "-3m"
                    # 0m = current month. Take the first row (newest) as the breakdown.
                    row = recs_df.iloc[0]
                    sb = int(row.get("strongBuy", 0) or 0)
                    b  = int(row.get("buy", 0) or 0)
                    h  = int(row.get("hold", 0) or 0)
                    s  = int(row.get("sell", 0) or 0)
                    ss = int(row.get("strongSell", 0) or 0)
                    if (sb + b + h + s + ss) > 0:
                        strong_buy, buy, hold, sell, strong_sell = sb, b, h, s, ss
                        total = strong_buy + buy + hold + sell + strong_sell
            except Exception as _:
                pass

        # Recommendation key (yfinance: "strong_buy", "buy", "hold", "sell", "strong_sell", "underperform")
        rec_key = (info.get("recommendationKey") or "").lower().replace(" ", "_")
        rec_mean = info.get("recommendationMean")  # 1=Strong Buy, 5=Strong Sell

        # Map to display label
        label_map = {
            "strong_buy":   "Strong Buy",
            "buy":          "Buy",
            "hold":         "Hold",
            "neutral":      "Hold",
            "underperform": "Sell",
            "sell":         "Sell",
            "strong_sell":  "Strong Sell",
        }
        rec_label = label_map.get(rec_key, "Hold")

        # Derive label from mean if key missing
        if not rec_key and rec_mean is not None:
            m = float(rec_mean)
            if m <= 1.5:   rec_label = "Strong Buy"
            elif m <= 2.5: rec_label = "Buy"
            elif m <= 3.5: rec_label = "Hold"
            elif m <= 4.5: rec_label = "Sell"
            else:           rec_label = "Strong Sell"

        # Price targets
        target_mean   = info.get("targetMeanPrice")
        target_median = info.get("targetMedianPrice") or target_mean
        target_high   = info.get("targetHighPrice")
        target_low    = info.get("targetLowPrice")
        current_price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
        n_analysts    = info.get("numberOfAnalystOpinions") or total or None

        # No fake fallback distribution. If yfinance didn't return a breakdown, the
        # frontend will display "Data unavailable" rather than fabricated numbers.
        # User explicitly asked for no fake info.

        # Upside / downside
        upside = None
        if target_median and current_price and float(current_price) > 0:
            upside = round((float(target_median) - float(current_price)) / float(current_price) * 100, 2)

        # Recent price history for chart (90 days)
        hist = tk.history(period="3mo", interval="1d")
        price_history = []
        if not hist.empty:
            price_history = [
                {"date": str(idx.date()), "close": round(float(row["Close"]), 4)}
                for idx, row in hist.iterrows()
            ]

        result = {
            "ticker":        ticker,
            "rec_label":     rec_label,
            "rec_key":       rec_key,
            "rec_mean":      rec_mean,
            "strong_buy":    strong_buy,
            "buy":           buy,
            "hold":          hold,
            "sell":          sell,
            "strong_sell":   strong_sell,
            "total_analysts": total or n_analysts or 0,
            "n_analysts":    n_analysts or total or 0,
            "target_mean":   round(float(target_mean), 4)   if target_mean   else None,
            "target_median": round(float(target_median), 4) if target_median else None,
            "target_high":   round(float(target_high), 4)   if target_high   else None,
            "target_low":    round(float(target_low), 4)    if target_low    else None,
            "current_price": round(float(current_price), 4) if current_price else None,
            "upside":        upside,
            "price_history": price_history,
        }

        cache_set(cache_key, result)
        return SafeJSONResponse({"data": result, "source": "live"})

    except Exception as e:
        logger.error(f"Analyst consensus failed for {ticker}: {e}")
        if cached:
            return SafeJSONResponse({"data": cached, "source": "cache (error)"})
        return SafeJSONResponse({"data": {"error": str(e)}, "source": "error"})


# ═══════════════════════════════════════════════════════════
# POLYMARKET ORDERFLOW + VOLUME PROFILE MODULE
# ═══════════════════════════════════════════════════════════

import uuid
import sqlite3 as _sql
import asyncio as _asyncio
from fastapi import WebSocket, WebSocketDisconnect

# ── Paper trading SQLite ──
_PAPER_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "paper_polymarket.db")
os.makedirs(os.path.dirname(_PAPER_DB_PATH), exist_ok=True)

def _paper_conn():
    c = _sql.connect(_PAPER_DB_PATH, check_same_thread=False)
    c.row_factory = _sql.Row
    return c

def _paper_init():
    with _paper_conn() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS paper_positions (
            id TEXT PRIMARY KEY, condition_id TEXT, token_id TEXT, outcome TEXT,
            side TEXT, size REAL, entry_price REAL, mark_price REAL,
            unrealized_pnl REAL, realized_pnl REAL, opened_ts INTEGER,
            closed_ts INTEGER, stop_prob REAL, take_prob REAL, status TEXT
        )""")
        c.commit()

_paper_init()


@app.get("/api/polymarket/orderflow/market/{condition_id}")
async def of_market(condition_id: str):
    from fetchers.polymarket import fetch_market_meta
    try:
        return await fetch_market_meta(condition_id)
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/polymarket/orderflow/trades/{condition_id}")
async def of_trades(condition_id: str, limit: int = 1000, side: str = "both"):
    from fetchers.polymarket import fetch_trades_raw, normalize_trades, fetch_market_meta
    try:
        raw = await fetch_trades_raw(condition_id, limit=limit)
        trades = normalize_trades(raw)
        if side in ("yes", "no"):
            meta = await fetch_market_meta(condition_id)
            tok = (meta.get("tokens") or {}).get(side)
            if tok and tok.get("token_id"):
                trades = [t for t in trades if t["token_id"] == tok["token_id"]]
        return {"trades": trades}
    except Exception as e:
        return {"error": str(e), "trades": []}


@app.get("/api/polymarket/orderflow/book/{token_id}")
async def of_book(token_id: str):
    from fetchers.polymarket import fetch_book
    try:
        return await fetch_book(token_id)
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/polymarket/orderflow/metrics/{condition_id}")
async def of_metrics(condition_id: str, window: int = 3600, side: str = "yes"):
    from fetchers.polymarket import compute_orderflow_metrics
    try:
        return await compute_orderflow_metrics(condition_id, window_sec=window, outcome=side)
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/polymarket/orderflow/profile/{condition_id}")
async def of_profile(condition_id: str, bin: float = 0.005, side: str = "yes", window: int = 86400):
    from fetchers.polymarket import fetch_trades_raw, normalize_trades, fetch_market_meta, compute_volume_profile
    try:
        raw = await fetch_trades_raw(condition_id, limit=3000)
        trades = normalize_trades(raw)
        meta = await fetch_market_meta(condition_id)
        tok = (meta.get("tokens") or {}).get(side)
        if tok and tok.get("token_id"):
            trades = [t for t in trades if t["token_id"] == tok["token_id"]]
        now_ms = int(time.time() * 1000)
        trades = [t for t in trades if t["ts"] >= now_ms - window * 1000]
        return compute_volume_profile(trades, bin_size=bin)
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/polymarket/orderflow/footprint/{condition_id}")
async def of_footprint(condition_id: str, bar_sec: int = 900, bin: float = 0.005, side: str = "yes", bars: int = 24):
    from fetchers.polymarket import fetch_trades_raw, normalize_trades, fetch_market_meta, build_footprint
    try:
        raw = await fetch_trades_raw(condition_id, limit=3000)
        trades = normalize_trades(raw)
        meta = await fetch_market_meta(condition_id)
        tok = (meta.get("tokens") or {}).get(side)
        if tok and tok.get("token_id"):
            trades = [t for t in trades if t["token_id"] == tok["token_id"]]
        fp = build_footprint(trades, bar_sec=bar_sec, bin_size=bin)
        return {"bar_sec": bar_sec, "bin": bin, "bars": fp[-bars:]}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/polymarket/orderflow/whales/{condition_id}")
async def of_whales(condition_id: str, min_notional: float = 1000.0, limit: int = 100):
    from fetchers.polymarket import fetch_trades_raw, normalize_trades, whale_filter
    try:
        raw = await fetch_trades_raw(condition_id, limit=2000)
        trades = normalize_trades(raw)
        whales = whale_filter(trades, min_notional=min_notional)
        whales.sort(key=lambda x: x["ts"], reverse=True)
        return {"threshold_used": min_notional, "trades": whales[:limit]}
    except Exception as e:
        return {"error": str(e), "trades": []}


# ── WebSocket passthrough ──
@app.websocket("/api/polymarket/orderflow/stream/{condition_id}")
async def of_stream(ws: WebSocket, condition_id: str):
    from fetchers.polymarket import fetch_market_meta, POLY_WS
    await ws.accept()
    try:
        meta = await fetch_market_meta(condition_id)
        tokens = meta.get("tokens") or {}
        yes_id = (tokens.get("yes") or {}).get("token_id")
        no_id  = (tokens.get("no")  or {}).get("token_id")
        asset_ids = [a for a in [yes_id, no_id] if a]
        if not asset_ids:
            await ws.send_json({"type": "error", "msg": "no token ids"})
            await ws.close()
            return

        try:
            import websockets as _ws
        except ImportError:
            await ws.send_json({"type": "error", "msg": "backend: pip install websockets"})
            await ws.close()
            return

        async def pump():
            async with _ws.connect(POLY_WS, ping_interval=None) as upstream:
                await upstream.send(json.dumps({
                    "assets_ids": asset_ids, "type": "market", "custom_feature_enabled": True
                }))

                async def ping_loop():
                    while True:
                        await _asyncio.sleep(10)
                        try: await upstream.send("PING")
                        except: return

                ping_task = _asyncio.create_task(ping_loop())
                try:
                    async for raw in upstream:
                        if raw == "PONG": continue
                        try:
                            payload = json.loads(raw) if isinstance(raw, str) else raw
                        except Exception:
                            continue
                        events = payload if isinstance(payload, list) else [payload]
                        for ev in events:
                            if not isinstance(ev, dict): continue
                            et = ev.get("event_type")
                            aid = ev.get("asset_id")
                            tok_name = "yes" if aid == yes_id else "no" if aid == no_id else None
                            if et == "last_trade_price":
                                price = float(ev.get("price") or 0)
                                size  = float(ev.get("size") or 0)
                                agg   = (ev.get("side") or "").lower()
                                await ws.send_json({
                                    "type": "trade",
                                    "ts": int(ev.get("timestamp") or 0),
                                    "token": tok_name, "aggressor": "buy" if agg == "buy" else "sell",
                                    "price": price, "size": size, "notional": round(price*size, 4),
                                })
                            elif et == "book":
                                bids = [[float(l["price"]), float(l["size"])] for l in ev.get("bids", [])]
                                asks = [[float(l["price"]), float(l["size"])] for l in ev.get("asks", [])]
                                bids.sort(key=lambda x: -x[0]); asks.sort(key=lambda x: x[0])
                                await ws.send_json({
                                    "type": "book", "token": tok_name,
                                    "bids": bids[:15], "asks": asks[:15],
                                    "ts": int(ev.get("timestamp") or 0),
                                })
                            elif et == "price_change":
                                await ws.send_json({"type": "price_change", "token": tok_name,
                                                    "changes": ev.get("changes", []),
                                                    "ts": int(ev.get("timestamp") or 0)})
                            elif et == "tick_size_change":
                                await ws.send_json({"type": "tick_size_change", "token": tok_name,
                                                    "new": float(ev.get("new_tick_size") or 0.01)})
                finally:
                    ping_task.cancel()

        await pump()
    except WebSocketDisconnect:
        return
    except Exception as e:
        try:
            await ws.send_json({"type": "status", "msg": f"error: {e}"})
            await ws.close()
        except Exception:
            pass


# ── Paper trading ──
class _PaperOrderIn(BaseModel):
    condition_id: str
    token_id: str
    outcome: str
    side: str  # BUY / SELL
    size: float
    limit_price: float
    stop_prob: float | None = None
    take_prob: float | None = None

@app.post("/api/polymarket/orderflow/paper/order")
async def paper_order(o: _PaperOrderIn):
    from fetchers.polymarket import fetch_book
    try:
        book = await fetch_book(o.token_id)
        best_ask = book["asks"][0][0] if book.get("asks") else None
        best_bid = book["bids"][0][0] if book.get("bids") else None
        fill = None
        if o.side.upper() == "BUY":
            if best_ask is None: return {"error": "no ask"}
            if o.limit_price < best_ask: return {"error": f"limit {o.limit_price} below best ask {best_ask}"}
            fill = best_ask
        else:
            if best_bid is None: return {"error": "no bid"}
            if o.limit_price > best_bid: return {"error": f"limit {o.limit_price} above best bid {best_bid}"}
            fill = best_bid

        pid = str(uuid.uuid4())
        now_ms = int(time.time() * 1000)
        with _paper_conn() as c:
            c.execute("""INSERT INTO paper_positions
                (id, condition_id, token_id, outcome, side, size, entry_price, mark_price,
                 unrealized_pnl, realized_pnl, opened_ts, closed_ts, stop_prob, take_prob, status)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (pid, o.condition_id, o.token_id, o.outcome, o.side.upper(), o.size, fill, fill,
                 0.0, 0.0, now_ms, None, o.stop_prob, o.take_prob, "OPEN"))
            c.commit()
        return {"ok": True, "id": pid, "fill_price": fill}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/polymarket/orderflow/paper/positions")
async def paper_positions():
    from fetchers.polymarket import fetch_book
    rows = []
    with _paper_conn() as c:
        for r in c.execute("SELECT * FROM paper_positions ORDER BY opened_ts DESC").fetchall():
            rows.append(dict(r))
    # Refresh marks for open positions
    for r in rows:
        if r["status"] != "OPEN": continue
        try:
            book = await fetch_book(r["token_id"])
            mid = None
            if book.get("bids") and book.get("asks"):
                mid = (book["bids"][0][0] + book["asks"][0][0]) / 2
            if mid is not None:
                r["mark_price"] = mid
                sign = 1 if r["side"] == "BUY" else -1
                r["unrealized_pnl"] = round(sign * r["size"] * (mid - r["entry_price"]), 4)
                # Check triggers
                hit_stop = r.get("stop_prob") is not None and (
                    (r["side"] == "BUY" and mid <= r["stop_prob"]) or
                    (r["side"] == "SELL" and mid >= r["stop_prob"])
                )
                hit_take = r.get("take_prob") is not None and (
                    (r["side"] == "BUY" and mid >= r["take_prob"]) or
                    (r["side"] == "SELL" and mid <= r["take_prob"])
                )
                if hit_stop or hit_take:
                    realized = r["unrealized_pnl"]
                    now_ms = int(time.time() * 1000)
                    with _paper_conn() as c2:
                        c2.execute("""UPDATE paper_positions SET mark_price=?, unrealized_pnl=0,
                            realized_pnl=?, closed_ts=?, status=? WHERE id=?""",
                            (mid, realized, now_ms, "STOPPED" if hit_stop else "TAKEN", r["id"]))
                        c2.commit()
                    r["status"] = "STOPPED" if hit_stop else "TAKEN"
                    r["realized_pnl"] = realized
                    r["closed_ts"] = now_ms
        except Exception:
            continue
    return {"positions": rows}


@app.post("/api/polymarket/orderflow/paper/close/{position_id}")
async def paper_close(position_id: str):
    from fetchers.polymarket import fetch_book
    with _paper_conn() as c:
        row = c.execute("SELECT * FROM paper_positions WHERE id=? AND status='OPEN'", (position_id,)).fetchone()
        if not row: return {"error": "position not found or already closed"}
        row = dict(row)
    try:
        book = await fetch_book(row["token_id"])
        mid = (book["bids"][0][0] + book["asks"][0][0]) / 2 if (book.get("bids") and book.get("asks")) else row["entry_price"]
    except Exception:
        mid = row["entry_price"]
    sign = 1 if row["side"] == "BUY" else -1
    realized = round(sign * row["size"] * (mid - row["entry_price"]), 4)
    now_ms = int(time.time() * 1000)
    with _paper_conn() as c:
        c.execute("""UPDATE paper_positions SET mark_price=?, unrealized_pnl=0,
            realized_pnl=?, closed_ts=?, status='CLOSED' WHERE id=?""",
            (mid, realized, now_ms, position_id))
        c.commit()
    return {"ok": True, "realized_pnl": realized, "close_price": mid}


@app.post("/api/polymarket/orderflow/paper/reset")
async def paper_reset():
    with _paper_conn() as c:
        c.execute("DELETE FROM paper_positions")
        c.commit()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info"
    )
