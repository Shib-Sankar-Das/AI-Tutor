"""
Diagnostic test API to verify Vercel Python functions and imports
"""

from fastapi import FastAPI
import sys
import os

app = FastAPI()

@app.get("/api/test")
async def test():
    return {"status": "ok", "message": "Test endpoint working"}

@app.get("/api/test/imports")
async def test_imports():
    """Test each import individually to find which one fails"""
    results = {}
    
    # Test basic imports
    try:
        import json
        results["json"] = "ok"
    except Exception as e:
        results["json"] = str(e)
    
    # Test fastapi (already imported if we get here)
    results["fastapi"] = "ok"
    
    # Test pydantic
    try:
        from pydantic import BaseModel
        results["pydantic"] = "ok"
    except Exception as e:
        results["pydantic"] = str(e)
    
    # Test langgraph
    try:
        from langgraph.graph import StateGraph
        results["langgraph"] = "ok"
    except Exception as e:
        results["langgraph"] = str(e)
    
    # Test langchain_core
    try:
        from langchain_core.messages import HumanMessage
        results["langchain_core"] = "ok"
    except Exception as e:
        results["langchain_core"] = str(e)
    
    # Test langchain_google_genai
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        results["langchain_google_genai"] = "ok"
    except Exception as e:
        results["langchain_google_genai"] = str(e)
    
    # Test supabase
    try:
        from supabase import create_client
        results["supabase"] = "ok"
    except Exception as e:
        results["supabase"] = str(e)
    
    # Test edge_tts
    try:
        import edge_tts
        results["edge_tts"] = "ok"
    except Exception as e:
        results["edge_tts"] = str(e)
    
    # Test pypdf
    try:
        from pypdf import PdfReader
        results["pypdf"] = "ok"
    except Exception as e:
        results["pypdf"] = str(e)
    
    # Test duckduckgo_search
    try:
        from duckduckgo_search import DDGS
        results["duckduckgo_search"] = "ok"
    except Exception as e:
        results["duckduckgo_search"] = str(e)
    
    # Check env vars
    results["GOOGLE_API_KEY"] = "set" if os.getenv("GOOGLE_API_KEY") else "not set"
    results["SUPABASE_URL"] = "set" if os.getenv("NEXT_PUBLIC_SUPABASE_URL") else "not set"
    
    return {
        "python_version": sys.version,
        "imports": results
    }

@app.get("/api/test/modules")
async def test_modules():
    """Test our custom module imports"""
    results = {}
    
    # Test services.tts
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from services.tts import generate_speech
        results["services.tts"] = "ok"
    except Exception as e:
        results["services.tts"] = str(e)
    
    # Test services.document
    try:
        from services.document import process_document
        results["services.document"] = "ok"
    except Exception as e:
        results["services.document"] = str(e)
    
    # Test services.search
    try:
        from services.search import web_search
        results["services.search"] = "ok"
    except Exception as e:
        results["services.search"] = str(e)
    
    # Test services.memory
    try:
        from services.memory import MemoryManager
        results["services.memory"] = "ok"
    except Exception as e:
        results["services.memory"] = str(e)
    
    # Test agents.supervisor
    try:
        from agents.supervisor import create_tutor_graph
        results["agents.supervisor"] = "ok"
    except Exception as e:
        results["agents.supervisor"] = str(e)
    
    return {
        "module_imports": results
    }

