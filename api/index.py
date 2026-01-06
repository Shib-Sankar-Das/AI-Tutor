"""
Agentic AI Tutor - FastAPI Backend
Main entry point for Vercel serverless deployment
Enhanced with Agentic Memory System
"""

from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import json
import asyncio
import sys

# Add parent directory to path for local development
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import our modules - try relative imports first (Vercel), then absolute (local)
try:
    from .agents.supervisor import (
        create_tutor_graph,
        AgentState,
        load_memory_context,
        save_interaction_memory,
    )
    from .services.tts import generate_speech
    from .services.document import process_document
    from .services.search import web_search
except ImportError:
    from agents.supervisor import (
        create_tutor_graph,
        AgentState,
        load_memory_context,
        save_interaction_memory,
    )
    from services.tts import generate_speech
    from services.document import process_document
    from services.search import web_search

# Try to import memory services
try:
    try:
        from .services.memory import MemoryManager, MemoryType, ImportanceLevel
    except ImportError:
        from services.memory import MemoryManager, MemoryType, ImportanceLevel
    MEMORY_AVAILABLE = True
except ImportError:
    MEMORY_AVAILABLE = False

# Initialize FastAPI app
app = FastAPI(
    title="Agentic AI Tutor API",
    description="Backend API for the Agentic AI Tutor - SDG 4 Quality Education",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class ChatRequest(BaseModel):
    message: str
    thread_id: str
    session_id: Optional[str] = None  # For memory tracking
    language: str = "en"
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    metadata: Optional[Dict[str, Any]] = None


class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-AriaNeural"
    rate: str = "+0%"


class MemoryRequest(BaseModel):
    user_id: str
    session_id: str
    memory_type: Optional[str] = None


class FeedbackRequest(BaseModel):
    user_id: str
    session_id: str
    message_id: str
    was_helpful: bool
    feedback_text: Optional[str] = None


# Health check endpoint
@app.get("/api/health")
async def health_check():
    google_api_key = os.getenv("GOOGLE_API_KEY")
    return {
        "status": "healthy",
        "service": "agentic-ai-tutor",
        "memory_system": MEMORY_AVAILABLE,
        "google_api_configured": bool(google_api_key),
        "google_api_key_prefix": google_api_key[:10] + "..." if google_api_key else None
    }


# Main chat endpoint with streaming
@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Main chat endpoint that invokes the LangGraph agentic workflow.
    Returns a streaming response (SSE) for real-time token delivery.
    Enhanced with memory system integration.
    """
    try:
        # Check API key first
        if not os.getenv("GOOGLE_API_KEY"):
            raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")
        
        # Create the agentic graph
        graph = create_tutor_graph()
        
        user_id = request.user_id or "anonymous"
        session_id = request.session_id or request.thread_id
        
        # Load memory context for this user
        memory_data = await load_memory_context(user_id, session_id, request.message)
        
        # Initialize state with memory context
        initial_state: AgentState = {
            "messages": [{"role": "user", "content": request.message}],
            "user_id": user_id,
            "session_id": session_id,
            "language": request.language,
            "visual_requested": False,
            "next_step": "supervisor",
            "rag_context": "",
            "search_results": "",
            # Memory-enhanced fields
            "memory_context": memory_data.get("memory_context", ""),
            "user_profile": memory_data.get("user_profile", {}),
            "effective_strategies": memory_data.get("effective_strategies", []),
            "current_topic": memory_data.get("current_topic"),
            "extracted_facts": [],
        }
        
        collected_response = ""
        final_state = None
        
        async def event_generator():
            """Generate SSE events from the graph execution"""
            nonlocal collected_response, final_state
            
            try:
                async for event in graph.astream_events(
                    initial_state,
                    config={"configurable": {"thread_id": request.thread_id}},
                    version="v2"
                ):
                    event_type = event.get("event")
                    
                    # Stream tokens as they're generated
                    if event_type == "on_chat_model_stream":
                        chunk = event.get("data", {}).get("chunk")
                        if chunk and hasattr(chunk, "content"):
                            token = chunk.content
                            if token:
                                collected_response += token
                                yield f"data: {json.dumps({'token': token})}\n\n"
                    
                    # Capture final state for memory storage
                    elif event_type == "on_chain_end":
                        output = event.get("data", {}).get("output", {})
                        if isinstance(output, dict) and "messages" in output:
                            final_state = output
                    
                    # Send tool usage events
                    elif event_type == "on_tool_start":
                        tool_name = event.get("name", "")
                        yield f"data: {json.dumps({'tool': tool_name, 'status': 'started'})}\n\n"
                    
                    elif event_type == "on_tool_end":
                        tool_name = event.get("name", "")
                        output = event.get("data", {}).get("output", "")
                        yield f"data: {json.dumps({'tool': tool_name, 'status': 'completed', 'output_preview': str(output)[:100]})}\n\n"
                
                # Save interaction to memory system
                if collected_response and MEMORY_AVAILABLE:
                    extracted_facts = final_state.get("extracted_facts", []) if final_state else []
                    await save_interaction_memory(
                        user_id=user_id,
                        session_id=session_id,
                        user_message=request.message,
                        assistant_response=collected_response,
                        topic=memory_data.get("current_topic"),
                        extracted_facts=extracted_facts
                    )
                
                # Signal completion
                yield f"data: {json.dumps({'done': True})}\n\n"
                
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Text-to-Speech endpoint
@app.get("/api/tts")
async def text_to_speech(text: str, voice: str = "en-US-AriaNeural", rate: str = "+0%"):
    """
    Generate speech from text using Edge TTS.
    Returns audio/mpeg stream.
    """
    try:
        audio_stream = generate_speech(text, voice, rate)
        
        return StreamingResponse(
            audio_stream,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Document ingestion endpoint
@app.post("/api/ingest")
async def ingest_document(file: UploadFile = File(...)):
    """
    Process and ingest a PDF document for RAG.
    Extracts text, creates embeddings, and stores in Supabase.
    """
    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        content = await file.read()
        result = await process_document(content, file.filename)
        
        return {
            "success": True,
            "filename": file.filename,
            "chunks_created": result["chunks_count"],
            "preview": result["preview"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Web search endpoint
@app.get("/api/search")
async def search(query: str, max_results: int = 5):
    """
    Perform web search using DuckDuckGo.
    """
    try:
        results = await web_search(query, max_results)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Image generation proxy (for Pollinations.ai)
@app.get("/api/image")
async def generate_image(prompt: str, width: int = 512, height: int = 512):
    """
    Generate an image URL using Pollinations.ai.
    Returns the URL to the generated image.
    """
    import urllib.parse
    
    encoded_prompt = urllib.parse.quote(prompt)
    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}"
    
    return {"url": image_url, "prompt": prompt}


# Memory System Endpoints
@app.get("/api/memory/profile/{user_id}")
async def get_user_memory_profile(user_id: str):
    """
    Get user's learning profile from semantic memory.
    Returns learning preferences, proficiencies, interests, etc.
    """
    if not MEMORY_AVAILABLE:
        return {"error": "Memory system not available", "profile": {}}
    
    try:
        manager = MemoryManager(user_id, "profile-query")
        profile = await manager.semantic.get_user_profile()
        return {"profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/memory/history/{user_id}")
async def get_learning_history(
    user_id: str,
    session_id: Optional[str] = None,
    limit: int = 20
):
    """
    Get user's learning history from episodic memory.
    Can filter by session_id for specific chat history.
    """
    if not MEMORY_AVAILABLE:
        return {"error": "Memory system not available", "history": []}
    
    try:
        manager = MemoryManager(user_id, session_id or "history-query")
        
        if session_id:
            history = await manager.episodic.get_session_history(session_id)
        else:
            history = await manager.episodic.recall_episodes("", limit=limit)
        
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/memory/strategies/{user_id}")
async def get_effective_strategies(user_id: str):
    """
    Get effective teaching strategies for this user from procedural memory.
    """
    if not MEMORY_AVAILABLE:
        return {"error": "Memory system not available", "strategies": []}
    
    try:
        manager = MemoryManager(user_id, "strategy-query")
        strategies = await manager.procedural.get_effective_strategies()
        return {"strategies": strategies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/memory/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Submit feedback on an interaction to improve procedural memory.
    This helps the AI learn what explanations work for this user.
    """
    if not MEMORY_AVAILABLE:
        return {"success": False, "error": "Memory system not available"}
    
    try:
        manager = MemoryManager(request.user_id, request.session_id)
        
        # Record the feedback as a procedural memory update
        await manager.procedural.record_explanation_outcome(
            topic="user_feedback",
            explanation_style=request.feedback_text or "general",
            was_successful=request.was_helpful,
            feedback=request.feedback_text
        )
        
        # If positive feedback, also store as episodic
        if request.was_helpful:
            await manager.episodic.store_episode(
                session_id=request.session_id,
                content=f"User found response helpful: {request.feedback_text or 'No additional feedback'}",
                context={"type": "positive_feedback", "message_id": request.message_id},
                importance=ImportanceLevel.MEDIUM
            )
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/memory/consolidate/{user_id}")
async def consolidate_memories(user_id: str, session_id: str):
    """
    Trigger memory consolidation for a user session.
    Called when a chat session ends to move important working memories to long-term.
    """
    if not MEMORY_AVAILABLE:
        return {"success": False, "error": "Memory system not available"}
    
    try:
        manager = MemoryManager(user_id, session_id)
        await manager.consolidate_memories()
        return {"success": True, "message": "Memories consolidated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/memory/context/{user_id}/{session_id}")
async def get_cross_session_context(
    user_id: str,
    session_id: str,
    topic: Optional[str] = None
):
    """
    Get context from previous sessions on related topics.
    Useful for maintaining learning continuity across sessions.
    """
    if not MEMORY_AVAILABLE:
        return {"error": "Memory system not available", "context": []}
    
    try:
        manager = MemoryManager(user_id, session_id)
        context = await manager.get_cross_session_context(topic=topic, limit=10)
        return {"context": context}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/memory/fact")
async def store_user_fact(
    user_id: str,
    category: str,
    fact: str,
    session_id: Optional[str] = None
):
    """
    Manually store a fact about the user in semantic memory.
    Useful for onboarding or explicit user preferences.
    """
    if not MEMORY_AVAILABLE:
        return {"success": False, "error": "Memory system not available"}
    
    try:
        manager = MemoryManager(user_id, session_id or "fact-store")
        memory_id = await manager.semantic.store_fact(
            category=category,
            fact=fact,
            source_session=session_id
        )
        return {"success": True, "memory_id": memory_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Vercel handler
def handler(request):
    """Vercel serverless function handler"""
    return app
