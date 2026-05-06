"""
CineMatch — Groq LLM assistant for movie discovery.

The LLM is grounded to the CineMatch dataset: the caller supplies a list of
validated titles from the dataset, and the system prompt instructs the LLM
to use ONLY those titles for final recommendations.
"""

from groq import Groq
from src.config.settings import GROQ_API_KEY

BASE_SYSTEM_PROMPT = """You are CineMatch Assistant, an expert AI movie guide embedded in the CineMatch movie discovery platform (5,000+ TMDB films).

Your role:
- Help users discover films they'll love from the CineMatch library
- Answer questions about movies, directors, actors, genres, and themes
- Keep replies concise and conversational (2–4 sentences unless asked for more)
- Use an enthusiastic, knowledgeable tone — like a film-obsessed friend

Rules:
- Only discuss movies, films, directors, actors, and entertainment
- If asked about something unrelated, politely redirect to movies
- Do not fabricate movie details — if unsure, say so clearly
- Do NOT use markdown headers or bullet points — keep replies natural and flowing"""


def send_message(
    messages: list[dict],
    user_input: str,
    dataset_suggestions: list[str] | None = None,
    watchlist_titles: list[str] | None = None,
    system_note: str | None = None,
) -> tuple[str, list[dict]]:
    """
    Send a message to CineMatch Assistant and return the reply + updated history.

    Args:
        messages:            existing conversation history
        user_input:          the new user message
        dataset_suggestions: validated movie titles from the CineMatch dataset.
                             When provided, the LLM is instructed to recommend
                             ONLY from this list so suggestions stay on-dataset.

    Returns:
        (reply_text, updated_messages_list)
    """
    client = Groq(api_key=GROQ_API_KEY)

    # Build system prompt — optionally ground it to dataset titles
    system_prompt = BASE_SYSTEM_PROMPT

    if watchlist_titles:
        wl = ", ".join(f'"{t}"' for t in watchlist_titles)
        system_prompt += (
            f"\n\nThe user's watchlist contains: {wl}. "
            f"Only reference these if a title shares clear genre or theme overlap with the user's request. "
            f"Never force a connection between unrelated films."
        )

    if dataset_suggestions:
        title_list = ", ".join(f'"{t}"' for t in dataset_suggestions)
        system_prompt += (
            f"\n\nFor this response, recommend ONLY from these verified CineMatch titles: {title_list}. "
            f"Do NOT recommend any title not in this list."
        )
    else:
        system_prompt += (
            "\n\nIf you cannot find specific relevant titles, respond conversationally "
            "and suggest the user use the Search or Browse features."
        )

    if system_note:
        system_prompt += f"\n\n{system_note}"

    updated_messages = messages + [{"role": "user", "content": user_input}]

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=700,
        messages=[{"role": "system", "content": system_prompt}] + updated_messages,
    )

    reply: str = response.choices[0].message.content
    updated_messages = updated_messages + [{"role": "assistant", "content": reply}]

    return reply, updated_messages
