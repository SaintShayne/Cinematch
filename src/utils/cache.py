import json
import os


def load_json_cache(path):
    fs_path = os.fspath(path)
    if not os.path.exists(fs_path):
        return {}

    try:
        with open(fs_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        # Corrupted/unreadable cache should never break app flows.
        return {}


def save_json_cache(path, data):
    fs_path = os.fspath(path)
    parent = os.path.dirname(fs_path)

    try:
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(fs_path, "w", encoding="utf-8") as f:
            json.dump(data, f)
        return True
    except OSError:
        # Write failures (e.g. read-only volume) are tolerated.
        return False
