"""
Agentic AI Tutor - FastAPI Backend
Main entry point for Vercel serverless deployment
Uses lazy imports to avoid cold start issues
"""

from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import json
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


# Helper function to parse presentation slides from LLM response
def parse_presentation_slides(content: str):
    """Parse the LLM response into structured slide data."""
    slides = []
    import re
    
    # Split by slide markers
    slide_pattern = r'---SLIDE\s*\d*---\s*(.*?)---END SLIDE---'
    matches = re.findall(slide_pattern, content, re.DOTALL | re.IGNORECASE)
    
    for i, match in enumerate(matches):
        slide = {
            "title": "",
            "body": "",
            "imagePrompt": ""
        }
        
        lines = match.strip().split('\n')
        body_lines = []
        
        for line in lines:
            line = line.strip()
            if line.lower().startswith('title:'):
                slide["title"] = line[6:].strip()
            elif line.lower().startswith('image suggestion:') or line.lower().startswith('image:'):
                slide["imagePrompt"] = line.split(':', 1)[1].strip()
            elif line.lower().startswith('content:'):
                continue  # Skip the "Content:" header
            elif line:
                body_lines.append(line)
        
        slide["body"] = '\n'.join(body_lines)
        
        if slide["title"] or slide["body"]:
            slides.append(slide)
    
    return slides if slides else None

# Initialize FastAPI app
app = FastAPI(
    title="Agentic AI Tutor API",
    description="Backend API for the Agentic AI Tutor - SDG 4 Quality Education",
    version="1.0.0",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class ImageData(BaseModel):
    base64: str
    mimeType: str

class ChatRequest(BaseModel):
    message: str
    thread_id: str
    session_id: Optional[str] = None
    language: str = "en"
    user_id: Optional[str] = None
    tool: Optional[str] = "auto"  # auto, chat, report, presentation
    image: Optional[ImageData] = None


class FeedbackRequest(BaseModel):
    user_id: str
    session_id: str
    message_id: str
    was_helpful: bool
    feedback_text: Optional[str] = None


# Lazy import helper
def get_tutor_modules():
    """Lazy import tutor modules"""
    from agents.supervisor import (
        create_tutor_graph,
        load_memory_context,
        save_interaction_memory,
    )
    return create_tutor_graph, load_memory_context, save_interaction_memory


def get_tts_module():
    """Lazy import TTS module"""
    from services.tts import generate_speech
    return generate_speech


def get_document_module():
    """Lazy import document module"""
    from services.document import process_document
    return process_document


def get_search_module():
    """Lazy import search module"""
    from services.search import web_search
    return web_search


def get_memory_module():
    """Lazy import memory module"""
    try:
        from services.memory import MemoryManager
        return MemoryManager
    except ImportError:
        return None


# Health check endpoint
@app.get("/api/health")
async def health_check():
    hf_token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
    google_api_key = os.getenv("GOOGLE_API_KEY")
    
    # Test imports
    modules_status = {}
    try:
        get_tutor_modules()
        modules_status["tutor"] = "ok"
    except Exception as e:
        modules_status["tutor"] = str(e)
    
    try:
        get_tts_module()
        modules_status["tts"] = "ok"
    except Exception as e:
        modules_status["tts"] = str(e)
    
    try:
        get_memory_module()
        modules_status["memory"] = "ok"
    except Exception as e:
        modules_status["memory"] = str(e)
    
    return {
        "status": "healthy",
        "service": "agentic-ai-tutor",
        "llm_provider": "huggingface",
        "llm_model": "gemma-3-27b-it",
        "huggingface_configured": bool(hf_token),
        "google_api_configured": bool(google_api_key),
        "modules": modules_status,
        "python_version": sys.version,
    }


# Main chat endpoint - uses Hugging Face Gemma-3-27b-it (FREE!)
@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Main chat endpoint - uses Hugging Face Inference API with Gemma-3-27b-it.
    100% FREE with unlimited requests!
    Supports tools: auto, chat, report, presentation
    """
    try:
        # Check API key first
        hf_token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
        if not hf_token:
            raise HTTPException(status_code=500, detail="HUGGINGFACE_API_KEY not configured. Get a free token at huggingface.co/settings/tokens")
        
        # Lazy import
        from agents.supervisor import call_huggingface_llm, supervisor_node, auto_select_tool
        from agents.supervisor import load_memory_context, save_interaction_memory
        
        user_id = request.user_id or "anonymous"
        session_id = request.session_id or request.thread_id
        selected_tool = request.tool or "auto"
        
        # Load memory context (no LLM calls, just database)
        memory_data = await load_memory_context(user_id, session_id, request.message)
        
        # Auto-select tool if needed
        if selected_tool == "auto":
            selected_tool = auto_select_tool(request.message)
        
        # Build state
        state = {
            "messages": [{"role": "user", "content": request.message}],
            "user_id": user_id,
            "session_id": session_id,
            "language": request.language,
            "visual_requested": False,
            "next_step": "supervisor",
            "rag_context": "",
            "search_results": "",
            "memory_context": memory_data.get("memory_context", ""),
            "user_profile": memory_data.get("user_profile", {}),
            "effective_strategies": memory_data.get("effective_strategies", []),
            "current_topic": memory_data.get("current_topic"),
            "extracted_facts": [],
            "selected_tool": selected_tool,
            "has_image": request.image is not None,
        }
        
        async def event_generator():
            """Generate SSE events with Hugging Face Gemma-3-27b-it"""
            try:
                yield f"data: {json.dumps({'status': 'routing', 'tool': selected_tool})}\n\n"
                
                # Build the prompt based on selected tool
                tool_prompts = {
                    "chat": """You are a helpful AI tutor. Explain concepts clearly and provide examples when helpful. 
Be encouraging and patient. Use markdown formatting for better readability.""",
                    
                    "report": """You are an expert report writer. Generate comprehensive, well-structured reports.
IMPORTANT GUIDELINES:
- Write detailed, multi-section reports with proper headings (## for main sections, ### for subsections)
- Include an executive summary, introduction, main content sections, and conclusion
- Use bullet points and numbered lists for clarity
- Provide data, examples, and evidence where relevant
- Make the report at least 1000 words for comprehensive coverage
- Use proper markdown formatting throughout
- End with key takeaways or recommendations""",
                    
                    "presentation": """You are an expert presentation designer. Create detailed slide content for presentations.
IMPORTANT: Structure your response as a complete presentation with multiple slides.
FORMAT EACH SLIDE AS:
---SLIDE [number]---
Title: [Slide Title]
Content:
- [Bullet point 1]
- [Bullet point 2]
- [Bullet point 3]
Image Suggestion: [Brief description for an image/icon that would enhance this slide]
---END SLIDE---

Include at minimum:
1. Title slide
2. Overview/Agenda slide
3. 4-8 content slides with detailed information
4. Summary/Conclusion slide
5. Q&A or Thank You slide

Make the content engaging, informative, and visually descriptive.""",
                }
                
                system_prompt = tool_prompts.get(selected_tool, tool_prompts["chat"])
                
                # Add memory context if available
                if state.get("memory_context"):
                    system_prompt += f"\n\nUser Context:\n{state['memory_context']}"
                
                # Build messages for Hugging Face API
                hf_messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.message}
                ]
                
                yield f"data: {json.dumps({'status': 'generating'})}\n\n"
                
                # Adjust max tokens based on tool type
                max_tokens = 2048
                if selected_tool == "report":
                    max_tokens = 4096  # Longer for reports
                elif selected_tool == "presentation":
                    max_tokens = 3072  # Medium for presentations
                
                # Call Hugging Face API (ONE call)
                response_content = await call_huggingface_llm(hf_messages, max_tokens=max_tokens)
                
                # Parse presentation slides if applicable
                slide_data = None
                if selected_tool == "presentation" and "---SLIDE" in response_content:
                    slide_data = parse_presentation_slides(response_content)
                
                # Stream the complete response as tokens (simulated streaming)
                words = response_content.split(' ')
                for i, word in enumerate(words):
                    token = word + (' ' if i < len(words) - 1 else '')
                    yield f"data: {json.dumps({'token': token})}\n\n"
                
                # Save to memory (no LLM call)
                try:
                    await save_interaction_memory(
                        user_id=user_id,
                        session_id=session_id,
                        user_message=request.message,
                        assistant_response=response_content,
                        topic=memory_data.get("current_topic"),
                        extracted_facts=[]
                    )
                except Exception as mem_error:
                    print(f"Memory save error (non-critical): {mem_error}")
                
                # Send completion with metadata
                completion_data = {'done': True, 'tool_used': selected_tool}
                if slide_data:
                    completion_data['slideData'] = slide_data
                
                yield f"data: {json.dumps(completion_data)}\n\n"
                
            except Exception as e:
                error_msg = str(e)
                # Provide user-friendly error messages
                if "401" in error_msg or "Unauthorized" in error_msg:
                    yield f"data: {json.dumps({'error': '⚠️ Invalid Hugging Face token. Please check your HUGGINGFACE_API_KEY.'})}\n\n"
                elif "503" in error_msg or "Service Unavailable" in error_msg:
                    yield f"data: {json.dumps({'error': '⚠️ Hugging Face model is loading. Please wait 30 seconds and try again.'})}\n\n"
                else:
                    yield f"data: {json.dumps({'error': f'Error: {error_msg}'})}\n\n"
        
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
    """Generate speech from text using Edge TTS."""
    try:
        generate_speech = get_tts_module()
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
    """Process and ingest a PDF document for RAG."""
    try:
        process_document = get_document_module()
        
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        content = await file.read()
        result = await process_document(content, file.filename)
        
        return {
            "success": True,
            "filename": file.filename,
            "chunks_created": result.get("chunks_created", 0),
            "message": "Document processed and indexed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Memory endpoints
@app.get("/api/memory/profile/{user_id}")
async def get_memory_profile(user_id: str):
    """Get user's memory profile including learning style and preferences."""
    try:
        MemoryManager = get_memory_module()
        if not MemoryManager:
            return {"error": "Memory system not available"}
        
        manager = MemoryManager(user_id, "profile")
        profile = await manager.get_user_profile()
        
        return {
            "user_id": user_id,
            "profile": profile
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/memory/context/{user_id}/{session_id}")
async def get_memory_context(user_id: str, session_id: str, query: str = ""):
    """Get relevant memory context for a query."""
    try:
        MemoryManager = get_memory_module()
        if not MemoryManager:
            return {"context": "", "error": "Memory system not available"}
        
        manager = MemoryManager(user_id, session_id)
        context = await manager.build_context_for_query(query)
        
        return context
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/memory/feedback")
async def submit_feedback(request: FeedbackRequest):
    """Submit feedback on a response for memory system learning."""
    try:
        MemoryManager = get_memory_module()
        if not MemoryManager:
            return {"success": False, "error": "Memory system not available"}
        
        manager = MemoryManager(request.user_id, request.session_id)
        await manager.record_feedback(
            message_id=request.message_id,
            was_helpful=request.was_helpful,
            feedback_text=request.feedback_text
        )
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/memory/consolidate/{user_id}")
async def consolidate_memories(user_id: str, session_id: str = None):
    """Consolidate working memory into long-term storage."""
    try:
        MemoryManager = get_memory_module()
        if not MemoryManager:
            return {"success": False, "error": "Memory system not available"}
        
        manager = MemoryManager(user_id, session_id or "consolidation")
        await manager.consolidate_session()
        
        return {"success": True, "message": "Memories consolidated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
