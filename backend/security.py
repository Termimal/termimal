# security.py — backend security primitives
# - ACCESS_TOKEN loaded from env with minimum-length validation
# - In-memory per-IP+path token bucket rate limiter (FastAPI middleware)
# - Audit log helper with sensitive-field scrubbing
# - CORS allowlist parser
#
# NOT for use as a complete auth system. The doc explicitly flags that the
# shared-token AccessGate is not real per-user auth — this module only
# hardens what is there until a real JWT/session backend lands.

from __future__ import annotations

import os
import re
import time
import json
import logging
import threading
from typing import Any, Iterable, Mapping, Optional
from collections import deque
from pathlib import Path

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)


# ─── SUPABASE JWT VERIFICATION ────────────────────────────────
# Supabase signs project JWTs with HS256 using the JWT secret found in
# the dashboard at Project Settings → API → JWT Settings → JWT Secret.
# Set it on the backend as SUPABASE_JWT_SECRET.
def _supabase_jwt_secret() -> str | None:
    return os.getenv("SUPABASE_JWT_SECRET") or None


def verify_supabase_jwt(token: str) -> dict | None:
    """
    Verify a Supabase access token and return its claims, or None on failure.
    Returns claims dict with at least {sub, email, aud, exp, role}.
    """
    if not token:
        return None
    secret = _supabase_jwt_secret()
    if not secret:
        return None
    try:
        import jwt  # PyJWT
    except ImportError:
        logger.error("PyJWT not installed — cannot verify Supabase JWTs")
        return None
    try:
        claims = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        if not claims.get("sub"):
            return None
        return claims
    except Exception as e:
        logger.debug("JWT verify failed: %s", e)
        return None


def extract_bearer(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return ""


# ─── ACCESS TOKEN ─────────────────────────────────────────────
def load_access_token(default_dev: str = "Termimal3131") -> str:
    """
    Load the access token from env. Falls back to a fixed dev token only when
    DEBUG / TERMIMAL_ENV != production. Logs a loud warning if the token is
    weak (< 32 chars) or the dev fallback is in use.
    """
    env = (os.getenv("TERMIMAL_ENV") or "development").lower()
    token = os.getenv("ACCESS_TOKEN") or ""

    if not token:
        if env == "production":
            raise RuntimeError(
                "ACCESS_TOKEN must be set in production. Refusing to start with the dev fallback."
            )
        logger.warning(
            "ACCESS_TOKEN not set — using dev fallback. Do NOT deploy this to a public host."
        )
        return default_dev

    if len(token) < 32:
        logger.warning(
            "ACCESS_TOKEN is shorter than 32 characters — pick a longer random value."
        )
    return token


# ─── CORS ALLOWLIST ───────────────────────────────────────────
def load_allowed_origins(default_dev: Iterable[str] = ("http://localhost:5173",)) -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    if not raw:
        env = (os.getenv("TERMIMAL_ENV") or "development").lower()
        if env == "production":
            logger.warning(
                "ALLOWED_ORIGINS not set in production — defaulting to no origins. "
                "Set ALLOWED_ORIGINS=https://termimal.com,https://www.termimal.com to enable."
            )
            return []
        return list(default_dev)
    return [s.strip().rstrip("/") for s in raw.split(",") if s.strip()]


# ─── RATE LIMIT ───────────────────────────────────────────────
class _Bucket:
    __slots__ = ("hits",)

    def __init__(self) -> None:
        self.hits: deque[float] = deque()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple sliding-window rate limiter.

    Default: 60 requests per IP per 10s on /api/* routes.
    Per-path overrides can be passed in `path_limits` as
        {("POST", "/api/polymarket/scan"): (5, 60)}
    meaning 5 hits per 60s.
    """

    def __init__(
        self,
        app,
        default_limit: int = 60,
        default_window: float = 10.0,
        path_limits: Mapping[tuple[str, str], tuple[int, float]] | None = None,
    ) -> None:
        super().__init__(app)
        self.default = (default_limit, default_window)
        self.path_limits = dict(path_limits or {})
        self._buckets: dict[str, _Bucket] = {}
        self._lock = threading.Lock()

    def _client_key(self, request: Request) -> str:
        fwd = request.headers.get("x-forwarded-for", "")
        ip = (fwd.split(",")[0].strip()) or (request.client.host if request.client else "unknown")
        return f"{ip}|{request.method}|{request.url.path}"

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        method = request.method.upper()
        path = request.url.path
        limit, window = self.path_limits.get((method, path), self.default)

        key = self._client_key(request)
        now = time.monotonic()

        with self._lock:
            bucket = self._buckets.setdefault(key, _Bucket())
            cutoff = now - window
            while bucket.hits and bucket.hits[0] < cutoff:
                bucket.hits.popleft()
            if len(bucket.hits) >= limit:
                retry_after = max(1, int(window - (now - bucket.hits[0])))
                logger.warning(
                    "rate_limit_block path=%s ip=%s hits=%d limit=%d window=%.1fs",
                    path, key.split("|", 1)[0], len(bucket.hits), limit, window,
                )
                return JSONResponse(
                    {"detail": "Too many requests. Please slow down and try again."},
                    status_code=429,
                    headers={"Retry-After": str(retry_after)},
                )
            bucket.hits.append(now)
            remaining = limit - len(bucket.hits)

        response: Response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response


# ─── AUDIT LOG ────────────────────────────────────────────────
_SENSITIVE_KEYS = {
    "password", "pwd", "secret", "token", "access_token", "refresh_token",
    "authorization", "auth", "cookie", "session", "apikey", "api_key",
    "card", "card_number", "cardnumber", "cvc", "cvv", "pan", "iban",
    "ssn", "tax_id", "private_key", "client_secret", "stripe_secret",
    "webhook_secret", "fred_api_key", "fmp_api_key", "polygon_api_key",
    "alphavantage_api_key", "alpha_vantage_api_key",
}

_KEYISH_RE = re.compile(r"^(sk|pk|whsec|rk|eyJ|0Okh|a113)[A-Za-z0-9_\-\.]{16,}$")


def scrub(value: Any, depth: int = 0) -> Any:
    """Recursively redact sensitive keys / key-shaped strings."""
    if depth > 6 or value is None:
        return value
    if isinstance(value, (list, tuple)):
        return [scrub(v, depth + 1) for v in value]
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            lk = str(k).lower()
            if lk in _SENSITIVE_KEYS or any(lk.endswith(f"_{s}") for s in _SENSITIVE_KEYS):
                out[k] = "[REDACTED]"
            elif isinstance(v, str) and _KEYISH_RE.match(v):
                out[k] = "[REDACTED]"
            else:
                out[k] = scrub(v, depth + 1)
        return out
    if isinstance(value, str) and _KEYISH_RE.match(value):
        return "[REDACTED]"
    return value


_AUDIT_LOG_PATH = Path(__file__).parent / "audit.log"
_audit_lock = threading.Lock()


def write_audit(
    *,
    action: str,
    user_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    ip_address: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Append a single JSON line to the audit log with sensitive-field scrubbing."""
    record = {
        "ts": int(time.time()),
        "action": action,
        "user_id": user_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "ip_address": ip_address,
        "metadata": scrub(metadata or {}),
    }
    line = json.dumps(record, ensure_ascii=False, default=str)
    try:
        with _audit_lock:
            with _AUDIT_LOG_PATH.open("a", encoding="utf-8") as fh:
                fh.write(line + "\n")
    except Exception as e:  # pragma: no cover
        logger.warning("audit log write failed (non-blocking): %s", e)


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return (fwd.split(",")[0].strip()) or (request.client.host if request.client else "unknown")


# ─── SECURITY HEADERS ─────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds defensive headers to every response. HSTS only takes effect over
    HTTPS — harmless over plain HTTP. CSP is intentionally permissive for
    the dev environment; tighten it in production by setting CSP_OVERRIDE
    in env.
    """

    DEFAULT_CSP = (
        "default-src 'self'; "
        "base-uri 'self'; "
        "frame-ancestors 'none'; "
        "img-src 'self' data: blob:; "
        "font-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "connect-src 'self' http://localhost:* https:; "
        "object-src 'none'"
    )

    def __init__(self, app, csp_override: str | None = None) -> None:
        super().__init__(app)
        self.csp = csp_override or os.getenv("CSP_OVERRIDE") or self.DEFAULT_CSP

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        h = response.headers
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        h.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), "
            "magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()",
        )
        h.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
        h.setdefault("Content-Security-Policy", self.csp)
        h.setdefault("X-Robots-Tag", "noindex, nofollow")
        return response
