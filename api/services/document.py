"""
Document Processing Service
Handles PDF ingestion, text extraction, chunking, and vector storage
"""

import os
from typing import Dict, Any, List
from pypdf import PdfReader
import io
import httpx

# Supabase client
from supabase import create_client, Client


def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise ValueError("Supabase credentials not configured")
    
    return create_client(url, key)


async def extract_text_from_pdf(content: bytes) -> str:
    """
    Extract text content from a PDF file.
    
    Args:
        content: PDF file content as bytes
    
    Returns:
        Extracted text as string
    """
    pdf_file = io.BytesIO(content)
    reader = PdfReader(pdf_file)
    
    text_content = []
    for page_num, page in enumerate(reader.pages):
        page_text = page.extract_text()
        if page_text:
            text_content.append(f"[Page {page_num + 1}]\n{page_text}")
    
    return "\n\n".join(text_content)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[Dict[str, Any]]:
    """
    Split text into overlapping chunks for embedding.
    
    Args:
        text: Full text to chunk
        chunk_size: Maximum characters per chunk
        overlap: Number of characters to overlap between chunks
    
    Returns:
        List of chunk dictionaries with content and metadata
    """
    chunks = []
    start = 0
    chunk_index = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence endings
            for delimiter in [". ", ".\n", "! ", "? ", "\n\n"]:
                last_delim = text[start:end].rfind(delimiter)
                if last_delim > chunk_size * 0.5:  # Only if it's past halfway
                    end = start + last_delim + len(delimiter)
                    break
        
        chunk_content = text[start:end].strip()
        
        if chunk_content:
            chunks.append({
                "content": chunk_content,
                "metadata": {
                    "chunk_index": chunk_index,
                    "start_char": start,
                    "end_char": end,
                }
            })
            chunk_index += 1
        
        start = end - overlap
        if start < 0:
            start = 0
    
    return chunks


async def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding vector using Google's embedding model.
    
    Args:
        text: Text to embed
    
    Returns:
        Embedding vector as list of floats
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}",
            json={
                "model": "models/text-embedding-004",
                "content": {
                    "parts": [{"text": text}]
                }
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Embedding API error: {response.text}")
        
        data = response.json()
        return data["embedding"]["values"]


async def process_document(content: bytes, filename: str) -> Dict[str, Any]:
    """
    Process a PDF document: extract text, chunk, embed, and store.
    
    Args:
        content: PDF file content
        filename: Original filename
    
    Returns:
        Processing result with chunk count and preview
    """
    # Extract text
    text = await extract_text_from_pdf(content)
    
    if not text.strip():
        raise ValueError("Could not extract text from PDF")
    
    # Chunk the text
    chunks = chunk_text(text)
    
    # Get Supabase client
    supabase = get_supabase_client()
    
    # Process each chunk
    for chunk in chunks:
        # Generate embedding
        embedding = await generate_embedding(chunk["content"])
        
        # Add filename to metadata
        chunk["metadata"]["filename"] = filename
        
        # Store in Supabase
        supabase.table("documents").insert({
            "content": chunk["content"],
            "embedding": embedding,
            "metadata": chunk["metadata"],
        }).execute()
    
    return {
        "chunks_count": len(chunks),
        "preview": text[:500] + "..." if len(text) > 500 else text,
        "total_characters": len(text),
    }


async def search_documents(
    query: str,
    match_threshold: float = 0.7,
    match_count: int = 5
) -> List[Dict[str, Any]]:
    """
    Search documents using semantic similarity.
    
    Args:
        query: Search query
        match_threshold: Minimum similarity threshold
        match_count: Maximum number of results
    
    Returns:
        List of matching document chunks
    """
    # Generate query embedding
    query_embedding = await generate_embedding(query)
    
    # Search in Supabase
    supabase = get_supabase_client()
    
    response = supabase.rpc(
        "match_documents",
        {
            "query_embedding": query_embedding,
            "match_threshold": match_threshold,
            "match_count": match_count,
        }
    ).execute()
    
    return response.data or []
