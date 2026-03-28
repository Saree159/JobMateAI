"""
Unit tests for the TechMap CSV service (app.services.techmap).
Tests the role→CSV mapping and data normalization logic without hitting the network.
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


# ---------------------------------------------------------------------------
# _csvs_for_role
# ---------------------------------------------------------------------------

def test_csvs_for_role_backend():
    from app.services.techmap import _csvs_for_role
    result = _csvs_for_role("backend developer")
    assert "backend" in result or "software" in result


def test_csvs_for_role_frontend():
    from app.services.techmap import _csvs_for_role
    result = _csvs_for_role("frontend engineer react")
    assert "frontend" in result


def test_csvs_for_role_data_science():
    from app.services.techmap import _csvs_for_role
    result = _csvs_for_role("data scientist machine learning")
    assert "data-science" in result


def test_csvs_for_role_devops():
    from app.services.techmap import _csvs_for_role
    result = _csvs_for_role("devops kubernetes")
    assert "devops" in result


def test_csvs_for_role_unknown_defaults_to_software():
    from app.services.techmap import _csvs_for_role
    result = _csvs_for_role("astronaut")
    assert result == ["software"]


def test_csvs_for_role_empty_defaults_to_software():
    from app.services.techmap import _csvs_for_role
    result = _csvs_for_role("")
    assert result == ["software"]


# ---------------------------------------------------------------------------
# _city translation
# ---------------------------------------------------------------------------

def test_city_hebrew_to_english():
    from app.services.techmap import _city
    assert _city("תל אביב") == "Tel Aviv"
    assert _city("חיפה") == "Haifa"
    assert _city("ירושלים") == "Jerusalem"


def test_city_unknown_passthrough():
    from app.services.techmap import _city
    assert _city("Eilat") == "Eilat"
    assert _city("Remote") == "Remote"


def test_city_strips_whitespace():
    from app.services.techmap import _city
    assert _city("  תל אביב  ") == "Tel Aviv"


# ---------------------------------------------------------------------------
# _fetch_csv — mocked HTTP
# ---------------------------------------------------------------------------

CSV_SAMPLE = "company,category,size,title,level,city,url,updated\nAcme,software,m,Backend Dev,mid,תל אביב,https://example.com/job/1,2024-01-01\nBeta,software,s,Frontend Dev,junior,Remote,https://example.com/job/2,2024-01-02\n"
EMPTY_CSV  = "company,category,size,title,level,city,url,updated\n"
NO_URL_CSV = "company,category,size,title,level,city,url,updated\nCorp,software,m,PM,senior,,,"


def _mock_response(text, status=200):
    mock = MagicMock()
    mock.text = text
    mock.status_code = status
    mock.raise_for_status = MagicMock()
    if status >= 400:
        mock.raise_for_status.side_effect = Exception(f"HTTP {status}")
    return mock


@pytest.mark.asyncio
async def test_fetch_csv_parses_jobs():
    from app.services.techmap import _fetch_csv

    with patch("httpx.AsyncClient") as MockClient:
        mock_resp = _mock_response(CSV_SAMPLE)
        MockClient.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_resp)

        jobs = await _fetch_csv("software")

    assert len(jobs) == 2
    assert jobs[0]["title"] == "Backend Dev"
    assert jobs[0]["company"] == "Acme"
    assert jobs[0]["location"] == "Tel Aviv"
    assert jobs[0]["company_size"] == "Medium"
    assert jobs[0]["source"] == "techmap"
    assert jobs[1]["location"] == "Remote"


@pytest.mark.asyncio
async def test_fetch_csv_empty_returns_empty_list():
    from app.services.techmap import _fetch_csv

    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.get = AsyncMock(return_value=_mock_response(EMPTY_CSV))
        jobs = await _fetch_csv("software")

    assert jobs == []


@pytest.mark.asyncio
async def test_fetch_csv_skips_rows_without_url():
    from app.services.techmap import _fetch_csv

    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.get = AsyncMock(return_value=_mock_response(NO_URL_CSV))
        jobs = await _fetch_csv("software")

    assert jobs == []


@pytest.mark.asyncio
async def test_fetch_csv_returns_empty_on_http_error():
    from app.services.techmap import _fetch_csv

    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.get = AsyncMock(return_value=_mock_response("", 404))
        jobs = await _fetch_csv("software")

    assert jobs == []


# ---------------------------------------------------------------------------
# fetch_for_role — deduplication
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fetch_for_role_deduplicates_by_url():
    from app.services.techmap import fetch_for_role

    # Same URL in two different CSVs → only one result
    duplicate_csv = "company,category,size,title,level,city,url,updated\nAcme,software,m,Dev,mid,Remote,https://example.com/job/99,2024-01-01\n"

    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.get = AsyncMock(return_value=_mock_response(duplicate_csv))
        jobs = await fetch_for_role("fullstack developer")

    urls = [j["url"] for j in jobs]
    assert len(urls) == len(set(urls)), "Duplicate URLs found"


@pytest.mark.asyncio
async def test_fetch_for_role_handles_network_failure():
    from app.services.techmap import fetch_for_role

    with patch("httpx.AsyncClient") as MockClient:
        MockClient.return_value.__aenter__.return_value.get = AsyncMock(side_effect=Exception("Network down"))
        jobs = await fetch_for_role("backend developer")

    assert jobs == []
