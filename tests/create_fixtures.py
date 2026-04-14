"""
Generates minimal fixture CSVs for CI.

These replace the real TMDB dataset (which is gitignored) so the backend
can start in CI without the full 5000-movie dataset.

Run once to regenerate:
    python tests/create_fixtures.py

The CI workflow copies the output to data/raw/ before starting the server.
"""

import json
import os
import pandas as pd

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Movie data ────────────────────────────────────────────────────────────────
# Covers every title queried in the test suite, plus enough variety for
# semantic search results, genre diversity, and recommendation overlap tests.

movies = [
    # Action / Adventure / SciFi
    {
        "id": 19995, "title": "Avatar",
        "genres": [{"id": 28, "name": "Action"}, {"id": 12, "name": "Adventure"}, {"id": 14, "name": "Fantasy"}, {"id": 878, "name": "ScienceFiction"}],
        "keywords": [{"id": 1463, "name": "culture clash"}, {"id": 2964, "name": "future"}, {"id": 10429, "name": "exotic alien"}],
        "vote_average": 7.2, "popularity": 150.4, "release_date": "2009-12-10",
        "overview": "In the 22nd century a paraplegic marine is dispatched to the moon Pandora on a mission that challenges his values.",
        "tagline": "Enter the World of Pandora",
    },
    {
        "id": 27205, "title": "Inception",
        "genres": [{"id": 28, "name": "Action"}, {"id": 878, "name": "ScienceFiction"}, {"id": 53, "name": "Thriller"}],
        "keywords": [{"id": 1562, "name": "dream"}, {"id": 4065, "name": "mind"}, {"id": 10791, "name": "subconscious"}],
        "vote_average": 8.3, "popularity": 29.0, "release_date": "2010-07-16",
        "overview": "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.",
        "tagline": "Your mind is the scene of the crime",
    },
    {
        "id": 157336, "title": "Interstellar",
        "genres": [{"id": 12, "name": "Adventure"}, {"id": 18, "name": "Drama"}, {"id": 878, "name": "ScienceFiction"}],
        "keywords": [{"id": 1299, "name": "space"}, {"id": 2793, "name": "time travel"}, {"id": 10093, "name": "black hole"}],
        "vote_average": 8.1, "popularity": 67.0, "release_date": "2014-11-05",
        "overview": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        "tagline": "Mankind was born on Earth. It was never meant to die here.",
    },
    {
        "id": 603, "title": "The Matrix",
        "genres": [{"id": 28, "name": "Action"}, {"id": 878, "name": "ScienceFiction"}],
        "keywords": [{"id": 83, "name": "virtual reality"}, {"id": 4372, "name": "hacker"}, {"id": 1699, "name": "simulation"}],
        "vote_average": 8.2, "popularity": 95.0, "release_date": "1999-03-30",
        "overview": "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
        "tagline": "Welcome to the Real World",
    },
    {
        "id": 11, "title": "Star Wars",
        "genres": [{"id": 28, "name": "Action"}, {"id": 12, "name": "Adventure"}, {"id": 878, "name": "ScienceFiction"}],
        "keywords": [{"id": 161, "name": "jedi"}, {"id": 1562, "name": "force"}, {"id": 163, "name": "lightsaber"}],
        "vote_average": 8.1, "popularity": 100.0, "release_date": "1977-05-25",
        "overview": "Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a wookiee and two droids to save the galaxy.",
        "tagline": "A long time ago in a galaxy far, far away...",
    },
    {
        "id": 329, "title": "Jurassic Park",
        "genres": [{"id": 28, "name": "Action"}, {"id": 12, "name": "Adventure"}, {"id": 878, "name": "ScienceFiction"}, {"id": 53, "name": "Thriller"}],
        "keywords": [{"id": 1299, "name": "dinosaurs"}, {"id": 2399, "name": "island"}, {"id": 1533, "name": "theme park"}],
        "vote_average": 7.9, "popularity": 80.0, "release_date": "1993-06-11",
        "overview": "A pragmatic paleontologist touring an almost finished theme park is tasked with protecting a couple of kids after a power failure causes the park's cloned dinosaurs to run loose.",
        "tagline": "An adventure 65 million years in the making",
    },
    {
        "id": 118340, "title": "Guardians of the Galaxy",
        "genres": [{"id": 28, "name": "Action"}, {"id": 12, "name": "Adventure"}, {"id": 878, "name": "ScienceFiction"}],
        "keywords": [{"id": 9715, "name": "superhero"}, {"id": 180547, "name": "comic"}, {"id": 3801, "name": "space"}],
        "vote_average": 7.9, "popularity": 90.0, "release_date": "2014-07-30",
        "overview": "Light-fingered Peter Quill is abducted by aliens as a kid and becomes a roguish space adventurer.",
        "tagline": "All heroes start somewhere",
    },
    # Crime / Thriller
    {
        "id": 155, "title": "The Dark Knight",
        "genres": [{"id": 28, "name": "Action"}, {"id": 80, "name": "Crime"}, {"id": 18, "name": "Drama"}],
        "keywords": [{"id": 849, "name": "joker"}, {"id": 2708, "name": "crime"}, {"id": 10013, "name": "batman"}],
        "vote_average": 8.5, "popularity": 123.0, "release_date": "2008-07-14",
        "overview": "When the menace known as the Joker wreaks havoc on Gotham City Batman must accept one of the greatest tests of his ability to fight injustice.",
        "tagline": "Why so serious?",
    },
    {
        "id": 680, "title": "Pulp Fiction",
        "genres": [{"id": 80, "name": "Crime"}, {"id": 18, "name": "Drama"}, {"id": 53, "name": "Thriller"}],
        "keywords": [{"id": 2253, "name": "crime"}, {"id": 2963, "name": "gangster"}, {"id": 1562, "name": "hitman"}],
        "vote_average": 8.5, "popularity": 55.0, "release_date": "1994-09-10",
        "overview": "The lives of two mob hit men, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.",
        "tagline": "Just because you are a character doesn't mean you have character.",
    },
    {
        "id": 769, "title": "Goodfellas",
        "genres": [{"id": 80, "name": "Crime"}, {"id": 18, "name": "Drama"}],
        "keywords": [{"id": 1567, "name": "mafia"}, {"id": 1547, "name": "mob"}, {"id": 2963, "name": "gangster"}],
        "vote_average": 8.5, "popularity": 45.0, "release_date": "1990-09-12",
        "overview": "The story of Henry Hill and his life through the 1955 mafia world after being adopted by a local mob boss.",
        "tagline": "Three Decades of Life in the Mafia.",
    },
    {
        "id": 550, "title": "Fight Club",
        "genres": [{"id": 28, "name": "Action"}, {"id": 18, "name": "Drama"}, {"id": 53, "name": "Thriller"}],
        "keywords": [{"id": 1562, "name": "identity"}, {"id": 2253, "name": "underground"}, {"id": 251, "name": "fight"}],
        "vote_average": 8.4, "popularity": 60.0, "release_date": "1999-10-15",
        "overview": "An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.",
        "tagline": "How much can you know about yourself if you've never been in a fight?",
    },
    {
        "id": 274, "title": "The Silence of the Lambs",
        "genres": [{"id": 80, "name": "Crime"}, {"id": 18, "name": "Drama"}, {"id": 27, "name": "Horror"}, {"id": 53, "name": "Thriller"}],
        "keywords": [{"id": 5161, "name": "fbi"}, {"id": 156216, "name": "serial killer"}, {"id": 3410, "name": "psychological"}],
        "vote_average": 8.3, "popularity": 45.0, "release_date": "1991-02-14",
        "overview": "A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer.",
        "tagline": "To enter the mind of a killer she must challenge the mind of a madman.",
    },
    # Romance / Drama
    {
        "id": 597, "title": "Titanic",
        "genres": [{"id": 18, "name": "Drama"}, {"id": 10749, "name": "Romance"}],
        "keywords": [{"id": 1299, "name": "ocean"}, {"id": 2095, "name": "ship"}, {"id": 3799, "name": "love story"}],
        "vote_average": 7.9, "popularity": 80.0, "release_date": "1997-11-18",
        "overview": "A young couple from different social classes fall in love aboard the ill-fated RMS Titanic.",
        "tagline": "Nothing on Earth could come between them.",
    },
    {
        "id": 11036, "title": "The Notebook",
        "genres": [{"id": 18, "name": "Drama"}, {"id": 10749, "name": "Romance"}],
        "keywords": [{"id": 3799, "name": "romance"}, {"id": 5565, "name": "love"}, {"id": 9748, "name": "memory"}],
        "vote_average": 7.3, "popularity": 45.0, "release_date": "2004-06-25",
        "overview": "An elderly man reads a love story from a faded notebook to a woman with memory loss.",
        "tagline": "Behind every great love is a great story.",
    },
    {
        "id": 13, "title": "Forrest Gump",
        "genres": [{"id": 35, "name": "Comedy"}, {"id": 18, "name": "Drama"}, {"id": 10749, "name": "Romance"}],
        "keywords": [{"id": 2253, "name": "vietnam"}, {"id": 3799, "name": "life"}, {"id": 10053, "name": "journey"}],
        "vote_average": 8.5, "popularity": 45.0, "release_date": "1994-07-06",
        "overview": "The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal through the eyes of an Alabama man.",
        "tagline": "Life is like a box of chocolates.",
    },
    # Horror
    {
        "id": 62, "title": "The Shining",
        "genres": [{"id": 27, "name": "Horror"}, {"id": 18, "name": "Drama"}, {"id": 53, "name": "Thriller"}],
        "keywords": [{"id": 2956, "name": "haunted"}, {"id": 4161, "name": "hotel"}, {"id": 2961, "name": "supernatural"}],
        "vote_average": 8.2, "popularity": 35.0, "release_date": "1980-05-23",
        "overview": "A family heads to an isolated hotel for the winter where a sinister presence influences the father into violence.",
        "tagline": "A masterpiece of modern horror.",
    },
    {
        "id": 539, "title": "Psycho",
        "genres": [{"id": 27, "name": "Horror"}, {"id": 9648, "name": "Mystery"}, {"id": 53, "name": "Thriller"}],
        "keywords": [{"id": 3410, "name": "psychological"}, {"id": 11108, "name": "motel"}, {"id": 156216, "name": "serial killer"}],
        "vote_average": 8.3, "popularity": 30.0, "release_date": "1960-09-08",
        "overview": "A Phoenix secretary embezzles forty thousand dollars from her employer's client, goes on the run, and checks into a remote motel.",
        "tagline": "Check in. Unpack. Relax.",
    },
    # Drama / History / War
    {
        "id": 424, "title": "Schindler's List",
        "genres": [{"id": 18, "name": "Drama"}, {"id": 36, "name": "History"}, {"id": 10752, "name": "War"}],
        "keywords": [{"id": 2252, "name": "holocaust"}, {"id": 2253, "name": "history"}, {"id": 2254, "name": "world war ii"}],
        "vote_average": 8.6, "popularity": 50.0, "release_date": "1993-11-30",
        "overview": "In German-occupied Poland during World War II Oskar Schindler gradually becomes concerned for his Jewish workforce.",
        "tagline": "Whoever saves one life, saves the world entire.",
    },
    # Comedy / Family / Animation
    {
        "id": 862, "title": "Toy Story",
        "genres": [{"id": 16, "name": "Animation"}, {"id": 35, "name": "Comedy"}, {"id": 10751, "name": "Family"}],
        "keywords": [{"id": 2581, "name": "toys"}, {"id": 9882, "name": "friendship"}, {"id": 12, "name": "adventure"}],
        "vote_average": 7.9, "popularity": 75.0, "release_date": "1995-10-30",
        "overview": "A cowboy doll is profoundly threatened and jealous when a new spaceman action figure supplants him as top toy.",
        "tagline": "Hang on for the most original comedy of the year",
    },
    {
        "id": 8587, "title": "The Lion King",
        "genres": [{"id": 16, "name": "Animation"}, {"id": 18, "name": "Drama"}, {"id": 10751, "name": "Family"}],
        "keywords": [{"id": 2580, "name": "lion"}, {"id": 2961, "name": "africa"}, {"id": 5560, "name": "father and son"}],
        "vote_average": 8.1, "popularity": 65.0, "release_date": "1994-06-15",
        "overview": "Lion cub Simba idolizes his father, King Mufasa, and takes to heart his own royal destiny.",
        "tagline": "Life's greatest adventure is finding your place in the Circle of Life.",
    },
    # Romantic Comedy
    {
        "id": 194, "title": "Amelie",
        "genres": [{"id": 35, "name": "Comedy"}, {"id": 10749, "name": "Romance"}],
        "keywords": [{"id": 9799, "name": "paris"}, {"id": 3799, "name": "love"}, {"id": 11108, "name": "quirky"}],
        "vote_average": 8.0, "popularity": 40.0, "release_date": "2001-04-25",
        "overview": "At a tiny Parisian cafe a young introverted woman decides to help those around her find happiness.",
        "tagline": "One person can change your life forever.",
    },
]

# ── Credits data ──────────────────────────────────────────────────────────────

credits_map = {
    19995:  {"cast": [{"name": "Sam Worthington"}, {"name": "Zoe Saldana"}, {"name": "Sigourney Weaver"}],  "crew": [{"job": "Director", "name": "James Cameron"}]},
    27205:  {"cast": [{"name": "Leonardo DiCaprio"}, {"name": "Joseph Gordon-Levitt"}, {"name": "Ellen Page"}], "crew": [{"job": "Director", "name": "Christopher Nolan"}]},
    157336: {"cast": [{"name": "Matthew McConaughey"}, {"name": "Anne Hathaway"}, {"name": "Jessica Chastain"}], "crew": [{"job": "Director", "name": "Christopher Nolan"}]},
    603:    {"cast": [{"name": "Keanu Reeves"}, {"name": "Laurence Fishburne"}, {"name": "Carrie-Anne Moss"}], "crew": [{"job": "Director", "name": "Lana Wachowski"}]},
    11:     {"cast": [{"name": "Mark Hamill"}, {"name": "Harrison Ford"}, {"name": "Carrie Fisher"}],         "crew": [{"job": "Director", "name": "George Lucas"}]},
    329:    {"cast": [{"name": "Sam Neill"}, {"name": "Laura Dern"}, {"name": "Jeff Goldblum"}],              "crew": [{"job": "Director", "name": "Steven Spielberg"}]},
    118340: {"cast": [{"name": "Chris Pratt"}, {"name": "Zoe Saldana"}, {"name": "Vin Diesel"}],              "crew": [{"job": "Director", "name": "James Gunn"}]},
    155:    {"cast": [{"name": "Christian Bale"}, {"name": "Heath Ledger"}, {"name": "Aaron Eckhart"}],       "crew": [{"job": "Director", "name": "Christopher Nolan"}]},
    680:    {"cast": [{"name": "John Travolta"}, {"name": "Uma Thurman"}, {"name": "Samuel L. Jackson"}],     "crew": [{"job": "Director", "name": "Quentin Tarantino"}]},
    769:    {"cast": [{"name": "Ray Liotta"}, {"name": "Robert De Niro"}, {"name": "Joe Pesci"}],             "crew": [{"job": "Director", "name": "Martin Scorsese"}]},
    550:    {"cast": [{"name": "Brad Pitt"}, {"name": "Edward Norton"}, {"name": "Helena Bonham Carter"}],    "crew": [{"job": "Director", "name": "David Fincher"}]},
    274:    {"cast": [{"name": "Jodie Foster"}, {"name": "Anthony Hopkins"}, {"name": "Ted Levine"}],         "crew": [{"job": "Director", "name": "Jonathan Demme"}]},
    597:    {"cast": [{"name": "Leonardo DiCaprio"}, {"name": "Kate Winslet"}, {"name": "Billy Zane"}],       "crew": [{"job": "Director", "name": "James Cameron"}]},
    11036:  {"cast": [{"name": "Ryan Gosling"}, {"name": "Rachel McAdams"}, {"name": "James Garner"}],       "crew": [{"job": "Director", "name": "Nick Cassavetes"}]},
    13:     {"cast": [{"name": "Tom Hanks"}, {"name": "Robin Wright"}, {"name": "Gary Sinise"}],              "crew": [{"job": "Director", "name": "Robert Zemeckis"}]},
    62:     {"cast": [{"name": "Jack Nicholson"}, {"name": "Shelley Duvall"}, {"name": "Danny Lloyd"}],       "crew": [{"job": "Director", "name": "Stanley Kubrick"}]},
    539:    {"cast": [{"name": "Anthony Perkins"}, {"name": "Janet Leigh"}, {"name": "Vera Miles"}],          "crew": [{"job": "Director", "name": "Alfred Hitchcock"}]},
    424:    {"cast": [{"name": "Liam Neeson"}, {"name": "Ben Kingsley"}, {"name": "Ralph Fiennes"}],          "crew": [{"job": "Director", "name": "Steven Spielberg"}]},
    862:    {"cast": [{"name": "Tom Hanks"}, {"name": "Tim Allen"}, {"name": "Don Rickles"}],                 "crew": [{"job": "Director", "name": "John Lasseter"}]},
    8587:   {"cast": [{"name": "Matthew Broderick"}, {"name": "Jeremy Irons"}, {"name": "James Earl Jones"}],"crew": [{"job": "Director", "name": "Roger Allers"}]},
    194:    {"cast": [{"name": "Audrey Tautou"}, {"name": "Mathieu Kassovitz"}, {"name": "Rufus"}],           "crew": [{"job": "Director", "name": "Jean-Pierre Jeunet"}]},
}

# ── Build DataFrames ──────────────────────────────────────────────────────────

movies_rows = []
for m in movies:
    movies_rows.append({
        "id":           m["id"],
        "title":        m["title"],
        "genres":       str(m["genres"]),
        "keywords":     str(m["keywords"]),
        "vote_average": m["vote_average"],
        "popularity":   m["popularity"],
        "overview":     m["overview"],
        "tagline":      m["tagline"],
        "release_date": m["release_date"],
    })

credits_rows = []
for movie_id, data in credits_map.items():
    credits_rows.append({
        "movie_id": movie_id,
        "title":    next(m["title"] for m in movies if m["id"] == movie_id),
        "cast":     str(data["cast"]),
        "crew":     str(data["crew"]),
    })

movies_df  = pd.DataFrame(movies_rows)
credits_df = pd.DataFrame(credits_rows)

movies_path  = os.path.join(OUTPUT_DIR, "tmdb_5000_movies.csv")
credits_path = os.path.join(OUTPUT_DIR, "tmdb_5000_credits.csv")

movies_df.to_csv(movies_path,  index=False)
credits_df.to_csv(credits_path, index=False)

print(f"✓ {len(movies_df)} movies  → {movies_path}")
print(f"✓ {len(credits_df)} credits → {credits_path}")
