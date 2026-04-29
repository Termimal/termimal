# supabase_admin.py — minimal HTTP client for Supabase admin operations.
# Avoids pulling in the official supabase-py dependency for two endpoints.

from __future__ import annotations

import os
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


def _supabase_url() -> str:
    return (os.getenv("SUPABASE_URL") or "").rstrip("/")


def _service_role_key() -> str:
    return os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""


def _admin_headers() -> dict[str, str]:
    key = _service_role_key()
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _check_configured() -> tuple[bool, str]:
    if not _supabase_url():
        return False, "SUPABASE_URL is not set"
    if not _service_role_key():
        return False, "SUPABASE_SERVICE_ROLE_KEY is not set"
    return True, ""


# ─── PostgREST queries (RLS-bypassing) ──────────────────────
def select_user_rows(table: str, user_id: str, user_id_column: str = "user_id") -> list[dict[str, Any]]:
    """Read every row of `table` belonging to `user_id`. Bypasses RLS via service-role."""
    ok, msg = _check_configured()
    if not ok:
        logger.warning("supabase_admin.select skipped: %s", msg)
        return []
    url = f"{_supabase_url()}/rest/v1/{table}"
    params = {user_id_column: f"eq.{user_id}", "select": "*"}
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.get(url, headers=_admin_headers(), params=params)
            r.raise_for_status()
            return r.json() if r.content else []
    except Exception as e:
        logger.warning("supabase_admin.select_user_rows(%s) failed: %s", table, e)
        return []


# ─── Auth admin (delete user) ───────────────────────────────
def delete_auth_user(user_id: str) -> tuple[bool, str]:
    """Delete a user via the Supabase Auth Admin API. Cascades through profiles → user-owned tables."""
    ok, msg = _check_configured()
    if not ok:
        return False, msg
    url = f"{_supabase_url()}/auth/v1/admin/users/{user_id}"
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.delete(url, headers=_admin_headers())
            if r.status_code in (200, 204):
                return True, ""
            return False, f"HTTP {r.status_code}: {r.text[:200]}"
    except Exception as e:
        return False, str(e)
