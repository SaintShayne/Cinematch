"""
Shared pytest configuration for all tests under tests/.

pytest_configure runs before test collection, which means before any
test module imports src.api.main. This is the correct hook for copying
fixture CSVs into data/raw/ so that the RecommendationService (which
loads those files at import time) can initialise without the real dataset.
"""

import shutil
from pathlib import Path


def pytest_configure(config):
    root = Path(__file__).parent.parent
    fixtures_dir = root / "tests" / "fixtures"
    data_raw = root / "data" / "raw"
    data_raw.mkdir(parents=True, exist_ok=True)
    for fname in ("tmdb_5000_movies.csv", "tmdb_5000_credits.csv"):
        src = fixtures_dir / fname
        dst = data_raw / fname
        if src.exists():
            shutil.copy2(src, dst)
