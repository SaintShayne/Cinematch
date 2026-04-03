"""
Test semantic search engine directly.
"""

from src.models.semantic_search import SemanticSearchEngine

engine = SemanticSearchEngine()

results = engine.search("space war movie", limit=5)

print("Semantic Search Results:")
for item in results:
    print(f"- {item['title']} (score={item['score']:.4f})")