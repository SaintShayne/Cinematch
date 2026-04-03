from src.services.recommendation_service import RecommendationService

service = RecommendationService(
    "data/raw/tmdb_5000_movies.csv",
    "data/raw/tmdb_5000_credits.csv"
)

movies, posters = service.get_recommendations(
    "Avatar",
    5
)

print("Recommended Movies:")
print(movies)

print("\nPoster URLs:")
print(posters)