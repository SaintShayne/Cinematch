import ast
import pandas as pd


def extract_genres(df):

    df["genres"] = df["genres"].fillna("[]")

    df["genre_list"] = df["genres"].apply(
        lambda x: [g["name"] for g in ast.literal_eval(x)]
    )

    df["release_year"] = pd.to_datetime(
        df["release_date"],
        errors="coerce"
    ).dt.year

    return df