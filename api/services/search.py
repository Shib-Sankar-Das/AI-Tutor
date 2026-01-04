"""
Web Search Service using DuckDuckGo
Provides free, unlimited web search for real-time fact-checking
"""

from typing import List, Dict, Any
from duckduckgo_search import DDGS
import asyncio


async def web_search(
    query: str,
    max_results: int = 5,
    region: str = "wt-wt"
) -> List[Dict[str, Any]]:
    """
    Perform a web search using DuckDuckGo.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return
        region: Region for search results (default: worldwide)
    
    Returns:
        List of search results with title, url, and body
    """
    def _search():
        with DDGS() as ddgs:
            results = list(ddgs.text(
                query,
                region=region,
                max_results=max_results
            ))
            return results
    
    # Run in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, _search)
    
    # Format results
    formatted_results = []
    for result in results:
        formatted_results.append({
            "title": result.get("title", ""),
            "url": result.get("href", ""),
            "snippet": result.get("body", ""),
        })
    
    return formatted_results


async def image_search(
    query: str,
    max_results: int = 5
) -> List[Dict[str, Any]]:
    """
    Search for images using DuckDuckGo.
    
    Args:
        query: Image search query
        max_results: Maximum number of images to return
    
    Returns:
        List of image results with url, title, and thumbnail
    """
    def _search():
        with DDGS() as ddgs:
            results = list(ddgs.images(
                query,
                max_results=max_results
            ))
            return results
    
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, _search)
    
    formatted_results = []
    for result in results:
        formatted_results.append({
            "url": result.get("image", ""),
            "title": result.get("title", ""),
            "thumbnail": result.get("thumbnail", ""),
            "source": result.get("source", ""),
        })
    
    return formatted_results


async def news_search(
    query: str,
    max_results: int = 5
) -> List[Dict[str, Any]]:
    """
    Search for news articles using DuckDuckGo.
    
    Args:
        query: News search query
        max_results: Maximum number of articles to return
    
    Returns:
        List of news articles with title, url, date, and source
    """
    def _search():
        with DDGS() as ddgs:
            results = list(ddgs.news(
                query,
                max_results=max_results
            ))
            return results
    
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, _search)
    
    formatted_results = []
    for result in results:
        formatted_results.append({
            "title": result.get("title", ""),
            "url": result.get("url", ""),
            "date": result.get("date", ""),
            "source": result.get("source", ""),
            "snippet": result.get("body", ""),
        })
    
    return formatted_results


def format_search_results_for_context(results: List[Dict[str, Any]]) -> str:
    """
    Format search results into a string for LLM context.
    
    Args:
        results: List of search results
    
    Returns:
        Formatted string for prompt injection
    """
    if not results:
        return "No search results found."
    
    formatted = []
    for i, result in enumerate(results, 1):
        formatted.append(f"""
[Source {i}]
Title: {result.get('title', 'N/A')}
URL: {result.get('url', 'N/A')}
Content: {result.get('snippet', result.get('body', 'N/A'))}
""".strip())
    
    return "\n\n".join(formatted)
