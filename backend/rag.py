from knowledge_base import VC_DOCUMENTS

_indexed = False
_docs: list[dict] = []


def _tokenize(text: str) -> set[str]:
    return set(text.lower().split())


def _bm25_score(query_tokens: set[str], doc_text: str) -> int:
    return len(query_tokens & _tokenize(doc_text))


def retrieve_context(query: str, n_results: int = 3) -> str:
    """Retrieve the most relevant VC framework documents for the given query using keyword overlap."""
    query_tokens = _tokenize(query)
    scored = sorted(
        VC_DOCUMENTS,
        key=lambda d: _bm25_score(query_tokens, d["text"]),
        reverse=True,
    )
    top_docs = [d["text"] for d in scored[:n_results]]
    return "\n\n---\n\n".join(top_docs)
