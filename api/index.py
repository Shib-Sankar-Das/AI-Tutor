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
    """Parse the LLM response into structured slide data with proper bullet points."""
    slides = []
    import re
    
    # Split by slide markers
    slide_pattern = r'---SLIDE\s*\d*---\s*(.*?)---END SLIDE---'
    matches = re.findall(slide_pattern, content, re.DOTALL | re.IGNORECASE)
    
    def clean_line(text: str) -> str:
        """Clean a single line of text."""
        # Remove markdown bold/italic markers
        text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
        text = re.sub(r'__([^_]+)__', r'\1', text)
        text = re.sub(r'\*([^*]+)\*', r'\1', text)
        text = re.sub(r'_([^_]+)_', r'\1', text)
        # Remove header markers
        text = re.sub(r'^#+\s*', '', text)
        return text.strip()
    
    for i, match in enumerate(matches):
        slide = {
            "title": "",
            "body": "",
            "imagePrompt": ""
        }
        
        lines = match.strip().split('\n')
        body_lines = []
        in_content = False
        
        for line in lines:
            line_stripped = line.strip()
            line_lower = line_stripped.lower()
            
            # Parse title
            if line_lower.startswith('title:'):
                slide["title"] = clean_line(line_stripped[6:].strip())
                in_content = False
            # Parse image prompt
            elif line_lower.startswith('image suggestion:') or line_lower.startswith('image:'):
                img_prompt = line_stripped.split(':', 1)[1].strip()
                if img_prompt and len(img_prompt) > 10:
                    slide["imagePrompt"] = img_prompt
                in_content = False
            # Start of content section
            elif line_lower.startswith('content:'):
                in_content = True
                # Check if there's content on the same line
                rest = line_stripped[8:].strip()
                if rest:
                    body_lines.append('• ' + clean_line(rest) if not rest.startswith('•') else clean_line(rest))
            # Body content lines
            elif line_stripped and in_content:
                cleaned = clean_line(line_stripped)
                if cleaned:
                    # Ensure bullet point format
                    if cleaned.startswith(('•', '-', '*')):
                        cleaned = '• ' + cleaned.lstrip('•-* ')
                    else:
                        cleaned = '• ' + cleaned
                    body_lines.append(cleaned)
            elif line_stripped and not line_lower.startswith(('title:', 'image', 'content:')):
                # Capture any other content that might be body text
                cleaned = clean_line(line_stripped)
                if cleaned and len(cleaned) > 3:
                    if cleaned.startswith(('•', '-', '*')):
                        cleaned = '• ' + cleaned.lstrip('•-* ')
                    body_lines.append(cleaned)
        
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
    tool: Optional[str] = "auto"  # auto, chat, report, presentation, image
    image: Optional[ImageData] = None


class ImageGenerationRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None
    width: int = 1024
    height: int = 1024
    steps: int = 28
    guidance_scale: float = 4.5


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
        "image_model": "stabilityai/stable-diffusion-3.5-large",
        "huggingface_configured": bool(hf_token),
        "google_api_configured": bool(google_api_key),
        "modules": modules_status,
        "python_version": sys.version,
    }


# Image Generation using Stable Diffusion 3.5 Large via Hugging Face
async def generate_image_sd35(prompt: str, negative_prompt: str = None, width: int = 1024, height: int = 1024, steps: int = 28, guidance_scale: float = 4.5):
    """
    Generate an image using Stability AI's Stable Diffusion 3.5 Large via Hugging Face Inference API.
    Returns base64 encoded image data.
    """
    import httpx
    import base64
    
    hf_token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
    if not hf_token:
        raise ValueError("HUGGINGFACE_API_KEY not configured")
    
    # Hugging Face Inference API endpoint for SD 3.5 Large
    api_url = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3.5-large"
    
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json",
    }
    
    # Build the payload
    payload = {
        "inputs": prompt,
        "parameters": {
            "num_inference_steps": steps,
            "guidance_scale": guidance_scale,
            "width": width,
            "height": height,
        }
    }
    
    if negative_prompt:
        payload["parameters"]["negative_prompt"] = negative_prompt
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(api_url, headers=headers, json=payload)
        
        if response.status_code == 503:
            # Model is loading, get estimated time
            data = response.json()
            estimated_time = data.get("estimated_time", 30)
            raise Exception(f"Model is loading. Please wait approximately {estimated_time:.0f} seconds and try again.")
        
        if response.status_code != 200:
            error_detail = response.text[:500]
            raise Exception(f"Image generation failed (HTTP {response.status_code}): {error_detail}")
        
        # The response is the raw image bytes
        image_bytes = response.content
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        return {
            "image_base64": image_base64,
            "mime_type": "image/jpeg",
            "prompt": prompt,
            "model": "stabilityai/stable-diffusion-3.5-large"
        }


# Image Generation Endpoint
@app.post("/api/generate-image")
async def generate_image(request: ImageGenerationRequest):
    """
    Generate an image using Stable Diffusion 3.5 Large.
    Returns base64 encoded image.
    """
    try:
        result = await generate_image_sd35(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            width=request.width,
            height=request.height,
            steps=request.steps,
            guidance_scale=request.guidance_scale
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
                
                # Handle Image Generation Tool separately
                if selected_tool == "image":
                    yield f"data: {json.dumps({'status': 'generating_image'})}\n\n"
                    
                    try:
                        # Generate the image using SD 3.5
                        image_result = await generate_image_sd35(
                            prompt=request.message,
                            negative_prompt="blurry, low quality, distorted, deformed, ugly, bad anatomy",
                            width=1024,
                            height=1024,
                            steps=28,
                            guidance_scale=4.5
                        )
                        
                        # Send a nice response with the image
                        response_text = f"""✨ **Image Generated Successfully!**

**Prompt:** {request.message}

**Model:** Stable Diffusion 3.5 Large (via Hugging Face)

Your image has been generated and is displayed below. You can right-click to save it."""
                        
                        # Stream the text response
                        words = response_text.split(' ')
                        for i, word in enumerate(words):
                            token = word + (' ' if i < len(words) - 1 else '')
                            yield f"data: {json.dumps({'token': token})}\n\n"
                        
                        # Send the image data
                        yield f"data: {json.dumps({'generatedImage': image_result})}\n\n"
                        
                        # Send completion
                        yield f"data: {json.dumps({'done': True, 'tool_used': 'image'})}\n\n"
                        return
                        
                    except Exception as img_error:
                        error_msg = str(img_error)
                        if "loading" in error_msg.lower():
                            yield f"data: {json.dumps({'error': f'⏳ {error_msg}'})}\n\n"
                        else:
                            yield f"data: {json.dumps({'error': f'❌ Image generation failed: {error_msg}'})}\n\n"
                        return
                
                # Handle Diagram Generation Tool
                if selected_tool == "diagram":
                    yield f"data: {json.dumps({'status': 'generating_diagram'})}\n\n"
                    
                    diagram_prompt = """You are an expert diagram creator. Generate SVG code for professional diagrams.

IMPORTANT RULES:
1. Output ONLY valid SVG code - no markdown, no explanation before the SVG
2. Start directly with <svg> tag and end with </svg>
3. Use a clean, modern design with proper spacing
4. Include appropriate colors (use a professional palette)
5. Add text labels inside the diagram
6. Use rounded rectangles, circles, and arrows for flowcharts
7. Ensure the diagram is readable and well-organized

SVG GUIDELINES:
- Set viewBox for responsive sizing (e.g., viewBox="0 0 800 600")
- Use fill colors like #3B82F6 (blue), #10B981 (green), #F59E0B (amber), #EF4444 (red), #8B5CF6 (purple)
- Use stroke for borders and arrows
- Include <defs> for arrow markers if needed
- Add drop shadows using <filter> for depth
- Use <text> elements with proper font-family (Arial, sans-serif)

DIAGRAM TYPES:
- Flowcharts: Use rectangles connected by arrows
- Block diagrams: Use rounded rectangles with labels
- Process diagrams: Show steps with arrows
- Hierarchy: Use tree structure
- Comparison: Side-by-side boxes

Generate a professional, visually appealing diagram based on the user's request."""

                    hf_messages = [
                        {"role": "system", "content": diagram_prompt},
                        {"role": "user", "content": f"Create an SVG diagram for: {request.message}"}
                    ]
                    
                    try:
                        response_content = await call_huggingface_llm(hf_messages, max_tokens=3072)
                        
                        # Extract SVG from response
                        import re
                        svg_match = re.search(r'<svg[\s\S]*?</svg>', response_content, re.IGNORECASE)
                        
                        if svg_match:
                            svg_code = svg_match.group(0)
                            
                            # Send explanation text first
                            explanation = f"""📊 **Diagram Generated!**

Here's your SVG diagram for: **{request.message}**

You can:
- **Preview** the diagram visually
- **Edit** the code to customize
- **Download** as SVG, XML, or PNG
- **Copy** the code to use elsewhere

"""
                            words = explanation.split(' ')
                            for i, word in enumerate(words):
                                token = word + (' ' if i < len(words) - 1 else '')
                                yield f"data: {json.dumps({'token': token})}\n\n"
                            
                            # Send diagram data
                            yield f"data: {json.dumps({'diagramSvg': svg_code, 'diagramTitle': request.message[:50]})}\n\n"
                            yield f"data: {json.dumps({'done': True, 'tool_used': 'diagram'})}\n\n"
                        else:
                            # No SVG found, return the raw response
                            words = response_content.split(' ')
                            for i, word in enumerate(words):
                                token = word + (' ' if i < len(words) - 1 else '')
                                yield f"data: {json.dumps({'token': token})}\n\n"
                            yield f"data: {json.dumps({'done': True, 'tool_used': 'diagram'})}\n\n"
                        return
                        
                    except Exception as diag_error:
                        yield f"data: {json.dumps({'error': f'❌ Diagram generation failed: {str(diag_error)}'})}\n\n"
                        return
                
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
                    
                    "presentation": """You are an expert presentation designer. Create professional, content-rich presentations.

CRITICAL: Follow this EXACT format for EVERY slide:

---SLIDE 1---
Title: [Main Presentation Title]
Content:
[A brief subtitle or tagline for the presentation]
Image: [Only if user specifically requested images for title slide]
---END SLIDE---

---SLIDE 2---
Title: [Overview/Agenda]
Content:
• First topic to be covered
• Second topic to be covered
• Third topic to be covered
• Fourth topic to be covered
---END SLIDE---

---SLIDE 3---
Title: [First Main Topic]
Content:
• Key point about this topic with specific details
• Another important aspect to understand
• Supporting information or example
• Additional relevant point
• Conclusion or takeaway for this topic
Image: [Only if user asked for images - describe specific visual]
---END SLIDE---

[Continue with 4-6 more content slides following the same format]

CONTENT RULES:
1. Use • for ALL bullet points (not -, not *)
2. Each bullet should be a complete thought (10-20 words)
3. Include specific facts, data, examples, or details
4. NO markdown formatting (no **, no ##, no ``` anywhere)
5. Make content educational and substantive
6. Follow the user's topic and requirements exactly
7. Don't skip or summarize information from the user's request

IMAGE RULES:
• Only include "Image:" line if user EXPLICITLY asks for images
• If user doesn't mention images, omit the Image line entirely
• If included, describe a specific, professional visual

SLIDE COUNT: Create 7-10 slides minimum for comprehensive coverage.

IMPORTANT: Capture ALL information from the user's prompt. Don't leave out any points they mentioned.""",
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
