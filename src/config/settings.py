"""
Global settings for the Movie Recommender project.

This file keeps configuration in one place so the app is:
- easier to maintain
- easier to deploy
- easier for other developers to understand
"""

from pathlib import Path
import os
from dotenv import load_dotenv

# Load .env file variables into the environment
load_dotenv()

# -------------------------------
# BASE PATHS
# -------------------------------
BASE_DIR = Path(__file__).resolve().parents[2]

DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"

CACHE_DIR = BASE_DIR / "cache"
CACHE_DIR.mkdir(exist_ok=True)

# -------------------------------
# DATA FILES
# -------------------------------
MOVIES_CSV = RAW_DATA_DIR / "tmdb_5000_movies.csv"
CREDITS_CSV = RAW_DATA_DIR / "tmdb_5000_credits.csv"

# -------------------------------
# CACHE FILES
# -------------------------------
POSTER_CACHE_PATH = CACHE_DIR / "posters.json"

# -------------------------------
# TMDB SETTINGS
# -------------------------------
TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")

# -------------------------------
# LLM SETTINGS
# -------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# -------------------------------
# OMDB SETTINGS  (free key at omdbapi.com â€” 1 000 req/day)
# -------------------------------
OMDB_API_KEY = os.getenv("OMDB_API_KEY", "")
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie"

# -------------------------------
# -------------------------------

# -------------------------------
# -------------------------------

# -------------------------------
# MODEL SETTINGS
# -------------------------------
MAX_FEATURES = 5000
STOP_WORDS = "english"

# -------------------------------
# NETWORK SETTINGS
# -------------------------------
POSTER_THREAD_WORKERS = 15
REQUEST_TIMEOUT = 5
