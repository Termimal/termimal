"""
Polymarket Intelligence Module
Wallet scoring · anomaly detection · anti-manipulation · cross-market confirmation
"""
import httpx, asyncio, json, uuid, math, logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from collections import defaultdict

logger = logging.getLogger(__name__)
GAMMA_BASE = "https://gamma-api.polymarket.com"
CLOB_BASE  = "https://clob.polymarket.com"
MIN_LIQUIDITY = 1_000_000

MACRO_KW = ["fed","fomc","rate hike","rate cut","bps","cpi","inflation","pce","nfp","payroll",
            "unemployment","gdp","recession","stagflation","boj","ecb","boe","election",
            "president","senate","congress","debt ceiling","bitcoin","btc","ethereum","eth",
            "ukraine","russia","taiwan","china","iran","oil","crude","opec","default","treasury",
            "yield","10-year","tariff","shutdown"]

TAG_MAP = {
    "MACRO":       ["fed","fomc","rate","cpi","inflation","nfp","payroll","gdp","recession","pce","boj","ecb","boe","stagflation","unemployment"],
    "POLITICAL":   ["election","president","senate","congress","debt ceiling","tariff","shutdown"],
    "CRYPTO":      ["bitcoin","btc","ethereum","eth"],
    "GEO":         ["ukraine","russia","taiwan","china","iran"],
    "COMMODITIES": ["oil","crude","opec"],
}

def _tag(q):
    q = q.lower()
    for tag, kws in TAG_MAP.items():
        if any(k in q for k in kws): return tag
    return "OTHER"

def _relevant(q):
    q = q.lower()
    return any(k in q for k in MACRO_KW)

async def _get(client, url, params=None, timeout=12):
    try:
        r = await client.get(url, params=params, timeout=timeout)
        r.raise_for_status(); return r.json()
    except Exception as e:
        logger.debug(f"GET {url}: {e}"); return None

def _parse_outcomes(m):
    or_ = m.get("outcomes", []); pr_ = m.get("outcomePrices", [])
    if isinstance(or_, str):
        try: or_ = json.loads(or_)
        except: or_ = []
    if isinstance(pr_, str):
        try: pr_ = json.loads(pr_)
        except: pr_ = []
    outcomes, yes = [], 0.0
    for i, name in enumerate(or_):
        p = 0.0
        if i < len(pr_):
            try: p = float(pr_[i])
            except: pass
        outcomes.append({"name": str(name), "price": p})
        if str(name).lower() == "yes": yes = p
    if not yes and outcomes: yes = outcomes[0]["price"]
    return outcomes, yes

def _instrument(tag):
    now = datetime.now(timezone.utc) - timedelta(hours=5)
    wd, h = now.weekday(), now.hour
    if wd >= 5:
        return {"instrument": "ETH" if tag == "CRYPTO" else "BTC"}
    return {"instrument": "/ES" if (9 <= h < 16) else "/MES"}

def _futures_dir(question, direction):
    q = question.lower()
    if direction == "YES":
        if any(k in q for k in ["rate hike","rate increase","25bp","50bp"]): return "SHORT"
        if any(k in q for k in ["recession","default","war","invasion"]): return "SHORT"
        if any(k in q for k in ["rate cut","pivot","pause"]): return "LONG"
        return "LONG"
    else:
        if any(k in q for k in ["rate hike","rate increase"]): return "LONG"
        if any(k in q for k in ["rate cut","pivot"]): return "SHORT"
        return "SHORT"

def _score_wallet(trades):
    n = len(trades)
    if n < 10: return {"score": 0, "reason": "insufficient_history", "trade_count": n, "accuracy": 0, "early_rate": 0}
    correct   = sum(1 for t in trades if t.get("correct"))
    accuracy  = correct / n
    early     = sum(1 for t in trades if float(t.get("price", 0.5)) < 0.40)
    early_rate = early / n
    score = (accuracy * 0.4 + early_rate * 0.3 + (math.log(max(n,1)) / math.log(100)) * 0.2) * 100
    return {"score": round(min(score,100),1), "accuracy": round(accuracy*100,1), "early_rate": round(early_rate*100,1), "trade_count": n, "reason": "ok"}

def _parse_ts(ts_raw):
    ts_raw = (ts_raw or "").replace("Z","+00:00").replace(" ","T")
    dt = datetime.fromisoformat(ts_raw)
    if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
    return dt

def _volume_stats(trades):
    now = datetime.now(timezone.utc)
    c1h, c7d = now - timedelta(hours=1), now - timedelta(days=7)
    vol_1h = 0.0; buckets = defaultdict(float)
    for t in trades:
        try:
            ts = _parse_ts(t.get("match_time") or t.get("created_at") or "")
            sz = float(t.get("size", 0))
            if ts >= c1h: vol_1h += sz
            if ts >= c7d: buckets[ts.strftime("%Y-%m-%d %H")] += sz
        except: continue
    avg = sum(buckets.values()) / max(len(buckets), 1)
    mult = vol_1h / max(avg, 1)
    return {"volume_1h": round(vol_1h,2), "avg_7d_hourly": round(avg,2), "multiplier": round(mult,2), "spike": mult >= 3.0}

def _directional_shift(trades, hours=2):
    now = datetime.now(timezone.utc); cutoff = now - timedelta(hours=hours)
    yr = nr = yp = np_ = 0.0
    for t in trades:
        try:
            ts = _parse_ts(t.get("match_time") or t.get("created_at") or "")
            sz = float(t.get("size", 0))
            is_yes = str(t.get("outcome","")).lower() == "yes" or float(t.get("price",0)) > 0.5
            if ts >= cutoff:
                yr += sz if is_yes else 0; nr += sz if not is_yes else 0
            else:
                yp += sz if is_yes else 0; np_ += sz if not is_yes else 0
        except: continue
    rr = yr/(yr+nr) if (yr+nr)>0 else 0.5
    rp = yp/(yp+np_) if (yp+np_)>0 else 0.5
    shift = abs(rr - rp)
    return {"shift": round(shift*100,2), "direction": "YES" if rr > rp else "NO", "ratio_recent": round(rr,4), "ratio_prior": round(rp,4), "significant": shift >= 0.08}

async def _analyze_wallets(client, trades, market_id):
    wallet_vols = defaultdict(float); wallet_trd = defaultdict(list); total = 0.0
    for t in trades:
        addr = t.get("maker_address") or t.get("trader") or ""
        if not addr or len(addr) < 10: continue
        sz = float(t.get("size", 0)); wallet_vols[addr] += sz; total += sz
        wallet_trd[addr].append(t)

    flags = []
    if total > 0:
        for addr, vol in wallet_vols.items():
            if vol/total > 0.60: flags.append(f"WHALE_DOMINANCE:{addr[:10]}...")

    top = sorted(wallet_vols.items(), key=lambda x:-x[1])[:10]
    scored = []
    for addr, vol in top:
        lt = wallet_trd[addr]
        sd = _score_wallet(lt) if len(lt) >= 10 else {"score": 0, "reason": "insufficient_history", "trade_count": len(lt), "accuracy": 0, "early_rate": 0}
        pnp = False
        if len(lt) >= 2:
            try:
                times = [_parse_ts(t.get("match_time") or t.get("created_at") or "") for t in lt]
                if (max(times)-min(times)).total_seconds()/3600 < 3:
                    pnp = True; flags.append(f"PUMP_DUMP:{addr[:10]}...")
            except: pass
        yes_vol = sum(float(t.get("size",0)) for t in lt if str(t.get("outcome","")).lower()=="yes" or float(t.get("price",0))>0.5)
        scored.append({"address": addr, "short_address": addr[:6]+"..."+addr[-4:], "volume": round(vol,2), "pct_of_market": round(vol/max(total,1)*100,1), "score": sd["score"], "accuracy": sd.get("accuracy",0), "early_rate": sd.get("early_rate",0), "trade_count": sd.get("trade_count",0), "direction": "YES" if yes_vol > vol*0.5 else "NO", "pump_dump_flag": pnp})

    hs = [w for w in scored if w["score"] >= 65 and not w["pump_dump_flag"]]
    cluster = False; cluster_dir = None
    if len(hs) >= 2:
        dirs = [w["direction"] for w in hs]; cluster_dir = max(set(dirs), key=dirs.count)
        cluster = dirs.count(cluster_dir) >= 2

    return {"wallets": scored, "high_score_wallets": hs, "cluster_confirmed": cluster, "cluster_direction": cluster_dir, "manipulation_flags": flags, "total_volume": round(total,2)}

def _detect_anomaly(vs, ds, wd):
    cond = {
        "volume_spike":      vs.get("spike", False),
        "directional_shift": ds.get("significant", False),
        "high_score_wallet": len(wd.get("high_score_wallets",[])) >= 1,
        "multi_wallet":      wd.get("cluster_confirmed", False),
        "no_manipulation":   len(wd.get("manipulation_flags",[])) == 0,
    }
    p = sum(cond.values())
    return {"level": "STRONG" if p==5 else ("WEAK" if p>=3 else "NONE"), "passed": p, "conditions": cond}

def _build_signal(market, direction, vs, ds, wd, anomaly):
    q = market.get("question","")
    inst = _instrument(market.get("tag","MACRO"))["instrument"]
    fd = _futures_dir(q, direction)
    hs = wd.get("high_score_wallets",[])
    avg_score = sum(w["score"] for w in hs)/max(len(hs),1)
    conf = min(100, int(anomaly["passed"]*15 + min(vs.get("multiplier",0),10)*3 + ds.get("shift",0)*0.5 + avg_score*0.2))
    reasons = []
    if vs.get("spike"): reasons.append(f"Volume {vs['multiplier']:.1f}x above 7d avg")
    if ds.get("significant"): reasons.append(f"{direction} bias +{ds['shift']:.1f}% in 2h")
    if hs: reasons.append(f"{len(hs)} smart wallet(s) avg score {avg_score:.0f}")
    if wd.get("cluster_confirmed"): reasons.append("Cluster confirmed")
    return {
        "signal_id": str(uuid.uuid4())[:8], "timestamp": datetime.now(timezone.utc).isoformat(),
        "market": q, "tag": market.get("tag",""), "direction": direction, "confidence": conf,
        "wallets_involved": [w["address"] for w in hs[:5]], "wallets_short": [w["short_address"] for w in hs[:5]],
        "avg_wallet_score": round(avg_score,1), "volume_multiplier": vs.get("multiplier",0),
        "volume_1h": vs.get("volume_1h",0), "polymarket_url": market.get("url",""),
        "recommended_instrument": inst, "recommended_direction": fd,
        "reasoning": "; ".join(reasons) or "Pattern detected",
        "cross_market_confirmation": False, "cross_market_checks": [],
        "signal_level": anomaly["level"], "conditions_met": anomaly["passed"],
        "yes_price": market.get("yes_price",0), "liquidity": market.get("liquidity",0),
        "outcome": None,
    }

async def fetch_markets():
    """Fetch Polymarket markets using the same proven-working pattern as Event Risk endpoint."""
    import asyncio
    import requests as req
    import logging as _log
    _logger = _log.getLogger(__name__)

    def _sync_fetch():
        try:
            _logger.info("fetch_markets: calling Gamma /events...")
            resp = req.get(
                f"{GAMMA_BASE}/events",
                params={"limit": 100, "active": "true", "closed": "false", "order": "volume24hr", "ascending": "false"},
                headers={"Accept": "application/json"},
                timeout=15,
            )
            if resp.status_code != 200:
                _logger.warning(f"fetch_markets: Gamma returned {resp.status_code}")
                return []
            raw_events = resp.json() or []
            _logger.info(f"fetch_markets: got {len(raw_events)} raw events")

            result = []
            for ev in raw_events:
                markets_list = ev.get("markets") or []
                if not markets_list:
                    continue
                mkt = markets_list[0]
                try:
                    liq = float(mkt.get("liquidityNum") or mkt.get("liquidity") or 0)
                    if liq < MIN_LIQUIDITY:
                        continue
                    q = mkt.get("question") or ev.get("title") or ""
                    if not q:
                        continue
                    # Parse outcome prices
                    try:
                        outcome_prices = json.loads(mkt.get("outcomePrices", "[]"))
                        yes = float(outcome_prices[0]) if outcome_prices else 0.5
                    except Exception:
                        yes = 0.5
                    outcomes = ["Yes", "No"]
                    result.append({
                        "id": mkt.get("conditionId") or mkt.get("id", ""),
                        "question": q,
                        "tag": _tag(q),
                        "yes_price": round(yes, 4),
                        "outcomes": outcomes,
                        "volume_24h": round(float(mkt.get("volume24hr") or 0)),
                        "volume_total": round(float(mkt.get("volumeNum") or mkt.get("volume") or 0)),
                        "liquidity": round(liq),
                        "end_date": mkt.get("endDate") or "",
                        "url": f"https://polymarket.com/event/{ev.get('slug', '')}",
                        "slug": ev.get("slug", ""),
                    })
                except (ValueError, TypeError, KeyError):
                    continue
            result.sort(key=lambda x: -x["volume_24h"])
            _logger.info(f"fetch_markets: returning {len(result)} markets >=${MIN_LIQUIDITY/1e6:.0f}M liquidity")
            return result[:60]
        except Exception as e:
            _logger.error(f"fetch_markets FAILED: {e}", exc_info=True)
            return []

    return await asyncio.to_thread(_sync_fetch)

async def analyze_market(market):
    mid = market["id"]
    async with httpx.AsyncClient() as client:
        trades = await _get(client, f"{CLOB_BASE}/trades", params={"market": mid, "limit": 500}) or []
    if isinstance(trades, dict): trades = trades.get("data",[])
    vs = _volume_stats(trades); ds = _directional_shift(trades)
    async with httpx.AsyncClient() as client:
        wd = await _analyze_wallets(client, trades, mid)
    anomaly = _detect_anomaly(vs, ds, wd)
    signal = None
    if anomaly["level"] in ("STRONG","WEAK"):
        signal = _build_signal(market, ds.get("direction","YES"), vs, ds, wd, anomaly)
    return {**market, "trades_analyzed": len(trades), "vol_stats": vs, "dir_shift": ds, "wallet_data": wd, "anomaly": anomaly, "signal": signal}

async def scan_top_markets(limit=10):
    markets = await fetch_markets()
    top = markets[:limit]
    sem = asyncio.Semaphore(5)
    async def one(m):
        async with sem:
            try: return await analyze_market(m)
            except Exception as e:
                logger.warning(f"analyze failed {m.get('id')}: {e}")
                return {**m, "trades_analyzed":0, "vol_stats":{}, "dir_shift":{}, "wallet_data":{}, "anomaly":{"level":"NONE","passed":0,"conditions":{}}, "signal":None}
    results = await asyncio.gather(*[one(m) for m in top])
    return {"markets": list(results), "strong_signals": [r["signal"] for r in results if r.get("signal") and r["signal"]["signal_level"]=="STRONG"], "weak_signals": [r["signal"] for r in results if r.get("signal") and r["signal"]["signal_level"]=="WEAK"], "scanned": len(results), "timestamp": datetime.now(timezone.utc).isoformat()}

def enrich_signal_with_cache(signal, prices_cache):
    q = signal.get("market","").lower(); direction = signal.get("direction","YES")
    confirmed = 0; checks = []
    vix = prices_cache.get("^VIX",{}); t10y = prices_cache.get("^TNX",{})
    if vix:
        vp = vix.get("pct",0)
        if any(k in q for k in ["rate hike","inflation"]) and direction=="YES" and vp > 0:
            confirmed += 1; checks.append(f"VIX↑ {vp:+.1f}% confirms hawkish")
        elif any(k in q for k in ["rate cut","pivot"]) and direction=="YES" and vp < 0:
            confirmed += 1; checks.append(f"VIX↓ {vp:+.1f}% confirms pivot")
    if t10y:
        tp = t10y.get("pct",0)
        if any(k in q for k in ["rate hike","inflation"]) and direction=="YES" and tp > 0:
            confirmed += 1; checks.append(f"10Y↑ {tp:+.1f}% confirms rate pressure")
    signal["cross_market_confirmation"] = confirmed >= 1
    signal["cross_market_checks"] = checks
    return signal


# ═══════════════════════════════════════════════════════════════════════════
# ORDERFLOW MODULE — new additions (do not modify existing functions above)
# ═══════════════════════════════════════════════════════════════════════════

import math
import statistics
from collections import defaultdict

CLOB_BASE = "https://clob.polymarket.com"
GAMMA_BASE = "https://gamma-api.polymarket.com"
DATA_API_BASE = "https://data-api.polymarket.com"
POLY_WS = "wss://ws-subscriptions-clob.polymarket.com/ws/market"

# ── Orderflow constants ────────────────────────────────────────────────────
WHALE_THRESHOLD_USD = 1000.0
MEGA_WHALE_USD      = 5000.0
PROFILE_BIN         = 0.005
PROFILE_BIN_THIN    = 0.01
PROFILE_BIN_DENSE   = 0.002
VALUE_AREA_PCT      = 0.70
HVN_THRESHOLD_PCT   = 0.70
LVN_THRESHOLD_PCT   = 0.25
FOOTPRINT_BAR_SEC   = 900
IMBALANCE_RATIO     = 3.0
IMBALANCE_MIN_CELL_USD = 50.0
STACKED_COUNT       = 3
ABSORPTION_FLOOR_USD = 500.0
ABSORPTION_K_SIGMA  = 2.0
ABSORPTION_RANGE_TICKS = 1
ABSORPTION_WINDOW_SEC = 10
SWEEP_LEVELS        = 3
SWEEP_WINDOW_MS     = 500
SWEEP_MIN_NOTIONAL  = 200.0
DIVERGENCE_PIVOT    = 3
TAPE_TIERS_USD      = (50, 250, 1000, 5000)


def _pick_bin(volume_24h: float) -> float:
    if volume_24h and volume_24h > 500000: return PROFILE_BIN_DENSE
    if volume_24h and volume_24h < 50000:  return PROFILE_BIN_THIN
    return PROFILE_BIN


async def fetch_market_meta(condition_id: str) -> dict:
    """Fetch market metadata from Gamma API + best bid/ask for both tokens."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{GAMMA_BASE}/markets", params={"condition_ids": condition_id})
        r.raise_for_status()
        arr = r.json()
        if not arr:
            return {"error": f"Market {condition_id} not found"}
        m = arr[0]
        import json as _json
        try:
            clob_ids = _json.loads(m.get("clobTokenIds") or "[]")
            outcomes = _json.loads(m.get("outcomes") or "[]")
        except Exception:
            clob_ids, outcomes = [], []
        yes_id = clob_ids[0] if len(clob_ids) > 0 else None
        no_id  = clob_ids[1] if len(clob_ids) > 1 else None
        # fetch books in parallel
        books = {"yes": None, "no": None}
        for tok, tid in (("yes", yes_id), ("no", no_id)):
            if not tid: continue
            try:
                br = await client.get(f"{CLOB_BASE}/book", params={"token_id": tid}, timeout=8)
                if br.status_code == 200:
                    books[tok] = br.json()
            except Exception:
                books[tok] = None

        def _best(book, side):
            if not book: return None
            levels = book.get("asks" if side == "ask" else "bids", [])
            if not levels: return None
            prices = [float(l["price"]) for l in levels]
            return min(prices) if side == "ask" else max(prices)

        def _tok(tid, book):
            tick = float(book.get("tick_size") or m.get("tickSize") or 0.01) if book else float(m.get("tickSize") or 0.01)
            mos  = float(book.get("min_order_size") or m.get("minimumOrderSize") or 5) if book else float(m.get("minimumOrderSize") or 5)
            return {
                "token_id": tid,
                "best_bid": _best(book, "bid"),
                "best_ask": _best(book, "ask"),
                "last":     float(m.get("lastTradePrice") or 0.0),
                "tick_size": tick,
                "min_order_size": mos,
            }
        return {
            "condition_id": condition_id,
            "question": m.get("question"),
            "slug": m.get("slug"),
            "end_date": m.get("endDate"),
            "volume_24h": float(m.get("volume24hr") or 0),
            "liquidity": float(m.get("liquidityNum") or 0),
            "neg_risk": bool(m.get("negRisk") or False),
            "outcomes": outcomes,
            "tokens": {
                "yes": _tok(yes_id, books["yes"]) if yes_id else None,
                "no":  _tok(no_id, books["no"])  if no_id else None,
            },
        }


async def fetch_trades_raw(condition_id: str, limit: int = 1000) -> list[dict]:
    """Fetch aggressor-side trades from Data API."""
    trades = []
    async with httpx.AsyncClient(timeout=15) as client:
        offset = 0
        page = 500
        while len(trades) < limit and offset < 10000:
            try:
                r = await client.get(
                    f"{DATA_API_BASE}/trades",
                    params={"market": condition_id, "takerOnly": "true", "limit": page, "offset": offset}
                )
                if r.status_code != 200: break
                batch = r.json() or []
                if not batch: break
                trades.extend(batch)
                if len(batch) < page: break
                offset += page
            except Exception:
                break
    return trades[:limit]


def normalize_trades(raw: list[dict]) -> list[dict]:
    """Convert raw Data API trade shape to normalized internal shape."""
    out = []
    for t in raw:
        try:
            price = float(t.get("price") or 0)
            size  = float(t.get("size") or 0)
            if size <= 0 or price <= 0: continue
            side = (t.get("side") or "").upper()
            ts   = int(t.get("timestamp") or 0)
            if ts < 1e12: ts = ts * 1000  # seconds → ms
            out.append({
                "ts": ts,
                "price": round(price, 6),
                "size": round(size, 4),
                "notional": round(price * size, 4),
                "side": side,
                "aggressor": "buy" if side == "BUY" else "sell",
                "outcome": t.get("outcome"),
                "outcome_index": t.get("outcomeIndex"),
                "token_id": str(t.get("asset") or ""),
                "wallet": t.get("proxyWallet"),
                "pseudonym": t.get("pseudonym") or t.get("name"),
                "tx": t.get("transactionHash"),
            })
        except Exception:
            continue
    out.sort(key=lambda x: x["ts"])
    return out


async def fetch_book(token_id: str) -> dict:
    """Fetch CLOB orderbook for a single token, float-parsed."""
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{CLOB_BASE}/book", params={"token_id": token_id})
        r.raise_for_status()
        raw = r.json()
    bids = [[float(l["price"]), float(l["size"])] for l in raw.get("bids", []) if float(l.get("size", 0)) > 0]
    asks = [[float(l["price"]), float(l["size"])] for l in raw.get("asks", []) if float(l.get("size", 0)) > 0]
    bids.sort(key=lambda x: -x[0])
    asks.sort(key=lambda x: x[0])
    spread = (asks[0][0] - bids[0][0]) if (bids and asks) else 1.0
    return {
        "token_id": token_id,
        "bids": bids,
        "asks": asks,
        "tick_size": float(raw.get("tick_size") or 0.01),
        "min_order_size": float(raw.get("min_order_size") or 5),
        "ts": int(raw.get("timestamp") or 0),
        "stale": spread > 0.90,
    }


def compute_cvd(trades: list[dict], reset: str = "daily_utc") -> list[dict]:
    """Cumulative volume delta in USDC notional, as a time series."""
    if not trades: return []
    cvd = 0.0
    series = []
    last_day = None
    for t in trades:
        if reset == "daily_utc":
            import datetime as _dt
            day = _dt.datetime.utcfromtimestamp(t["ts"] / 1000).date()
            if last_day is not None and day != last_day:
                cvd = 0.0
            last_day = day
        delta = t["notional"] if t["aggressor"] == "buy" else -t["notional"]
        cvd += delta
        series.append({"ts": t["ts"], "cvd": round(cvd, 4)})
    return series


def compute_volume_profile(trades: list[dict], bin_size: float = PROFILE_BIN, side_filter: str = "all") -> dict:
    """Build volume profile on 0–1 probability axis. POC + VAH/VAL via CME 70% pair-wise expansion."""
    if not trades:
        return {"bin": bin_size, "total_volume_notional": 0.0, "bins": [], "poc": None, "vah": None, "val": None, "hvn": [], "lvn": []}

    buckets = defaultdict(lambda: {"buy": 0.0, "sell": 0.0})
    for t in trades:
        if side_filter != "all":
            pass  # caller passes already-filtered trades by token
        p = round(round(t["price"] / bin_size) * bin_size, 6)
        if t["aggressor"] == "buy":
            buckets[p]["buy"] += t["notional"]
        else:
            buckets[p]["sell"] += t["notional"]

    if not buckets:
        return {"bin": bin_size, "total_volume_notional": 0.0, "bins": [], "poc": None, "vah": None, "val": None, "hvn": [], "lvn": []}

    # Sorted bin list ascending by price
    sorted_prices = sorted(buckets.keys())
    bins_arr = []
    for p in sorted_prices:
        b = buckets[p]
        total = b["buy"] + b["sell"]
        bins_arr.append({"price": p, "buy": round(b["buy"], 4), "sell": round(b["sell"], 4), "total": round(total, 4)})

    total_vol = sum(b["total"] for b in bins_arr)
    if total_vol <= 0:
        return {"bin": bin_size, "total_volume_notional": 0.0, "bins": bins_arr, "poc": None, "vah": None, "val": None, "hvn": [], "lvn": []}

    # POC
    poc_idx = max(range(len(bins_arr)), key=lambda i: bins_arr[i]["total"])
    poc_price = bins_arr[poc_idx]["price"]

    # CME 70% value-area expansion
    target = VALUE_AREA_PCT * total_vol
    vol_accum = bins_arr[poc_idx]["total"]
    up = poc_idx + 1
    dn = poc_idx - 1
    while vol_accum < target and (up < len(bins_arr) or dn >= 0):
        up_sum = 0.0
        if up < len(bins_arr):
            up_sum = bins_arr[up]["total"] + (bins_arr[up+1]["total"] if up+1 < len(bins_arr) else 0)
        dn_sum = 0.0
        if dn >= 0:
            dn_sum = bins_arr[dn]["total"] + (bins_arr[dn-1]["total"] if dn-1 >= 0 else 0)
        if up_sum >= dn_sum and up < len(bins_arr):
            vol_accum += bins_arr[up]["total"]
            if up+1 < len(bins_arr): vol_accum += bins_arr[up+1]["total"]
            up += 2
        elif dn >= 0:
            vol_accum += bins_arr[dn]["total"]
            if dn-1 >= 0: vol_accum += bins_arr[dn-1]["total"]
            dn -= 2
        else:
            break
    vah = bins_arr[min(up-1, len(bins_arr)-1)]["price"]
    val = bins_arr[max(dn+1, 0)]["price"]

    # HVN / LVN detection
    poc_vol = bins_arr[poc_idx]["total"]
    hvn = []
    lvn = []
    for i, b in enumerate(bins_arr):
        if poc_vol <= 0: break
        ratio = b["total"] / poc_vol
        is_local_max = (i > 0 and i < len(bins_arr)-1 and bins_arr[i-1]["total"] < b["total"] > bins_arr[i+1]["total"])
        is_local_min = (i > 0 and i < len(bins_arr)-1 and bins_arr[i-1]["total"] > b["total"] < bins_arr[i+1]["total"])
        if is_local_max and ratio >= HVN_THRESHOLD_PCT and b["price"] != poc_price:
            if not hvn or abs(b["price"] - hvn[-1]) > 5 * bin_size:
                hvn.append(b["price"])
        if is_local_min and ratio <= LVN_THRESHOLD_PCT:
            lvn.append(b["price"])

    return {
        "bin": bin_size,
        "total_volume_notional": round(total_vol, 4),
        "bins": bins_arr,
        "poc": poc_price,
        "vah": vah,
        "val": val,
        "hvn": hvn,
        "lvn": lvn,
    }


def build_footprint(trades: list[dict], bar_sec: int = FOOTPRINT_BAR_SEC, bin_size: float = PROFILE_BIN) -> list[dict]:
    """Group trades into time-bar × price-cell footprint."""
    if not trades: return []
    bar_ms = bar_sec * 1000
    bars: dict[int, dict] = {}
    for t in trades:
        bar_key = (t["ts"] // bar_ms) * bar_ms
        if bar_key not in bars:
            bars[bar_key] = {"ts_start": bar_key, "open": t["price"], "high": t["price"], "low": t["price"],
                             "close": t["price"], "cells": defaultdict(lambda: {"buy": 0.0, "sell": 0.0})}
        b = bars[bar_key]
        b["high"] = max(b["high"], t["price"])
        b["low"]  = min(b["low"],  t["price"])
        b["close"] = t["price"]
        pbin = round(round(t["price"] / bin_size) * bin_size, 6)
        if t["aggressor"] == "buy":
            b["cells"][pbin]["buy"] += t["notional"]
        else:
            b["cells"][pbin]["sell"] += t["notional"]

    out = []
    for bar_key in sorted(bars):
        b = bars[bar_key]
        cells_list = []
        for p in sorted(b["cells"].keys()):
            cell = b["cells"][p]
            cell_total = cell["buy"] + cell["sell"]
            if cell_total < IMBALANCE_MIN_CELL_USD:
                imb = 1.0
            else:
                imb = (cell["buy"] / cell["sell"]) if cell["sell"] > 0 else (cell["buy"] / 1e-9)
            cells_list.append({
                "price": p,
                "buy": round(cell["buy"], 2),
                "sell": round(cell["sell"], 2),
                "imbalance": round(imb, 2),
                "stacked": False,
            })
        # Detect stacked imbalance zones
        stacked_zones = []
        run_side = None; run_start = None; run_count = 0
        for i, c in enumerate(cells_list):
            is_buy = c["imbalance"] >= IMBALANCE_RATIO and c["buy"] >= IMBALANCE_MIN_CELL_USD
            is_sell = c["imbalance"] <= (1/IMBALANCE_RATIO) and c["sell"] >= IMBALANCE_MIN_CELL_USD
            side = "buy" if is_buy else ("sell" if is_sell else None)
            if side and side == run_side:
                run_count += 1
            else:
                if run_side and run_count >= STACKED_COUNT:
                    for j in range(i - run_count, i):
                        cells_list[j]["stacked"] = True
                    stacked_zones.append({"from": cells_list[i-run_count]["price"], "to": cells_list[i-1]["price"],
                                          "side": run_side, "count": run_count})
                run_side = side; run_start = i; run_count = 1 if side else 0
        if run_side and run_count >= STACKED_COUNT:
            for j in range(len(cells_list) - run_count, len(cells_list)):
                cells_list[j]["stacked"] = True
            stacked_zones.append({"from": cells_list[-run_count]["price"], "to": cells_list[-1]["price"],
                                  "side": run_side, "count": run_count})

        delta = round(sum(c["buy"] - c["sell"] for c in cells_list), 2)
        # Unfinished auction = top/bottom cell has >0 on only one side
        unfinished_top = False; unfinished_bot = False
        if cells_list:
            top = cells_list[-1]; bot = cells_list[0]
            unfinished_top = (top["buy"] > 0 and top["sell"] == 0) or (top["sell"] > 0 and top["buy"] == 0)
            unfinished_bot = (bot["buy"] > 0 and bot["sell"] == 0) or (bot["sell"] > 0 and bot["buy"] == 0)
        out.append({
            "ts_start": b["ts_start"],
            "open": b["open"], "high": b["high"], "low": b["low"], "close": b["close"],
            "delta": delta,
            "cells": cells_list,
            "unfinished_top": unfinished_top,
            "unfinished_bot": unfinished_bot,
            "stacked_zones": stacked_zones,
        })
    return out


def detect_absorption(trades: list[dict], bin_size: float = PROFILE_BIN) -> list[dict]:
    """Detect absorption events: heavy one-sided volume with price range ≤ 1 tick over ≥10s."""
    if len(trades) < 5: return []
    # Rolling windows per price bin
    events = []
    window_ms = ABSORPTION_WINDOW_SEC * 1000

    # Bucket trades by price bin
    by_bin: dict[float, list[dict]] = defaultdict(list)
    for t in trades:
        pbin = round(round(t["price"] / bin_size) * bin_size, 6)
        by_bin[pbin].append(t)

    # Adaptive threshold = max(floor, μ + kσ)
    all_cell_vols = [sum(t["notional"] for t in bucket) for bucket in by_bin.values() if len(bucket) >= 2]
    if all_cell_vols and len(all_cell_vols) > 3:
        mu = statistics.mean(all_cell_vols)
        sigma = statistics.pstdev(all_cell_vols)
        adaptive = mu + ABSORPTION_K_SIGMA * sigma
    else:
        adaptive = 0
    threshold = max(ABSORPTION_FLOOR_USD, adaptive)

    for pbin, bucket in by_bin.items():
        if len(bucket) < 3: continue
        span_ms = bucket[-1]["ts"] - bucket[0]["ts"]
        if span_ms < window_ms: continue
        prices = [t["price"] for t in bucket]
        if max(prices) - min(prices) > bin_size * ABSORPTION_RANGE_TICKS: continue
        buy_vol = sum(t["notional"] for t in bucket if t["aggressor"] == "buy")
        sell_vol = sum(t["notional"] for t in bucket if t["aggressor"] == "sell")
        if buy_vol > sell_vol * 2 and buy_vol >= threshold:
            events.append({"ts": bucket[-1]["ts"], "price": pbin, "aggressor": "buy",
                           "volume": round(buy_vol, 2), "price_range": round(max(prices) - min(prices), 4)})
        elif sell_vol > buy_vol * 2 and sell_vol >= threshold:
            events.append({"ts": bucket[-1]["ts"], "price": pbin, "aggressor": "sell",
                           "volume": round(sell_vol, 2), "price_range": round(max(prices) - min(prices), 4)})
    events.sort(key=lambda x: x["ts"], reverse=True)
    return events[:50]


def detect_sweeps(trades: list[dict]) -> list[dict]:
    """Detect aggressive sweeps: ≥3 distinct ticks same aggressor within 500ms, ≥$200 notional."""
    if len(trades) < 3: return []
    sweeps = []
    i = 0
    while i < len(trades) - 2:
        t0 = trades[i]
        same_side = [t0]
        j = i + 1
        while j < len(trades) and (trades[j]["ts"] - t0["ts"]) <= SWEEP_WINDOW_MS:
            if trades[j]["aggressor"] == t0["aggressor"]:
                same_side.append(trades[j])
            j += 1
        distinct_prices = {t["price"] for t in same_side}
        total_notional = sum(t["notional"] for t in same_side)
        if len(distinct_prices) >= SWEEP_LEVELS and total_notional >= SWEEP_MIN_NOTIONAL:
            sweeps.append({
                "ts": same_side[-1]["ts"],
                "aggressor": t0["aggressor"],
                "levels": len(distinct_prices),
                "notional": round(total_notional, 2),
                "duration_ms": same_side[-1]["ts"] - same_side[0]["ts"],
            })
            i = j
        else:
            i += 1
    sweeps.sort(key=lambda x: x["ts"], reverse=True)
    return sweeps[:50]


def detect_divergences(cvd_series: list[dict], trades: list[dict]) -> list[dict]:
    """Detect regular bull/bear divergences via pivot strength 3."""
    if len(cvd_series) < 2 * DIVERGENCE_PIVOT + 1 or len(trades) < 2 * DIVERGENCE_PIVOT + 1:
        return []
    # Build resampled series keyed by trade index
    prices = [t["price"] for t in trades]
    cvds = [c["cvd"] for c in cvd_series]
    n = min(len(prices), len(cvds))
    if n < 2 * DIVERGENCE_PIVOT + 1: return []
    prices = prices[:n]; cvds = cvds[:n]
    ts_arr = [t["ts"] for t in trades[:n]]

    def pivots(arr, high=True):
        piv = []
        for i in range(DIVERGENCE_PIVOT, len(arr) - DIVERGENCE_PIVOT):
            window = arr[i - DIVERGENCE_PIVOT:i + DIVERGENCE_PIVOT + 1]
            if high and arr[i] == max(window): piv.append(i)
            elif not high and arr[i] == min(window): piv.append(i)
        return piv

    price_highs = pivots(prices, high=True)
    price_lows  = pivots(prices, high=False)
    out = []
    # Bearish regular: price higher-high, CVD lower-high
    for a, b in zip(price_highs, price_highs[1:]):
        if prices[b] > prices[a] and cvds[b] < cvds[a]:
            out.append({"ts": ts_arr[b], "type": "bearish_regular", "price_pivot": prices[b], "cvd_pivot": cvds[b]})
    # Bullish regular: price lower-low, CVD higher-low
    for a, b in zip(price_lows, price_lows[1:]):
        if prices[b] < prices[a] and cvds[b] > cvds[a]:
            out.append({"ts": ts_arr[b], "type": "bullish_regular", "price_pivot": prices[b], "cvd_pivot": cvds[b]})
    out.sort(key=lambda x: x["ts"], reverse=True)
    return out[:30]


def whale_filter(trades: list[dict], min_notional: float = WHALE_THRESHOLD_USD) -> list[dict]:
    """Return trades with notional >= max(min_notional, 99th-percentile of recent trades)."""
    if not trades: return []
    if len(trades) >= 100:
        sorted_notionals = sorted(t["notional"] for t in trades[-10000:])
        p99_idx = int(len(sorted_notionals) * 0.99)
        p99 = sorted_notionals[min(p99_idx, len(sorted_notionals) - 1)]
        threshold = max(min_notional, p99)
    else:
        threshold = min_notional
    return [t for t in trades if t["notional"] >= threshold]


async def compute_orderflow_metrics(condition_id: str, window_sec: int = 3600, outcome: str = "yes") -> dict:
    """Full metrics snapshot for the drilldown."""
    meta = await fetch_market_meta(condition_id)
    if "error" in meta: return meta
    tok = meta["tokens"].get(outcome.lower())
    if not tok: return {"error": f"Outcome {outcome} not found"}
    target_token = tok["token_id"]

    raw_trades = await fetch_trades_raw(condition_id, limit=2000)
    normed = normalize_trades(raw_trades)
    filtered = [t for t in normed if t["token_id"] == target_token]

    now_ms = int(__import__("time").time() * 1000)
    window_ms = window_sec * 1000
    windowed = [t for t in filtered if t["ts"] >= now_ms - window_ms]

    buy_notional = sum(t["notional"] for t in windowed if t["aggressor"] == "buy")
    sell_notional = sum(t["notional"] for t in windowed if t["aggressor"] == "sell")
    cvd_series = compute_cvd(filtered)  # lifetime series
    absorptions = detect_absorption(windowed)
    sweeps = detect_sweeps(windowed)
    divergences = detect_divergences(cvd_series[-500:], filtered[-500:])

    return {
        "window_sec": window_sec,
        "outcome": outcome,
        "trade_count": len(windowed),
        "buy_notional": round(buy_notional, 2),
        "sell_notional": round(sell_notional, 2),
        "delta_notional": round(buy_notional - sell_notional, 2),
        "cvd_series": cvd_series[-500:],
        "absorption_events": absorptions,
        "sweeps": sweeps,
        "divergences": divergences,
    }
