"""
Data loading utilities.

This module is shared by backend services and should NOT depend on Streamlit.
"""

from pathlib import Path
from functools import lru_cache
import pandas as pd

DATA_PATH = Path("data/raw")


@lru_cache(maxsize=1)
def load_movies():
    """
    Load the movies CSV once and cache it in memory.
    """
    return pd.read_csv(DATA_PATH / "tmdb_5000_movies.csv")


@lru_cache(maxsize=1)
def load_credits():
    """
    Load the credits CSV once and cache it in memory.
    """
    return pd.read_csv(DATA_PATH / "tmdb_5000_credits.csv")