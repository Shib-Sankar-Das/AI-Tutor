"""
LangGraph Supervisor Agent - The Brain of the AI Tutor
Orchestrates multiple specialized agents based on user intent
Enhanced with Agentic Memory System for context-aware tutoring
Now supports Hugging Face Inference API with Gemma-3-27b-it (FREE!)
"""

from typing import TypedDict, Annotated, List, Dict, Any, Literal, Optional
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import os
import sys
import json
import asyncio
import httpx

# Add parent directory to path for local development
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import memory system
try:
    try:
        from ..services.memory import (
            MemoryManager,
            get_memory_context,
            EpisodicMemory,
            SemanticMemory,
            ProceduralMemory,
            WorkingMemory,
            ImportanceLevel,
        )
    except ImportError:
        from services.memory import (
            MemoryManager,
            get_memory_context,
            EpisodicMemory,
            SemanticMemory,
            ProceduralMemory,
            WorkingMemory,
            ImportanceLevel,
        )
    MEMORY_AVAILABLE = True
except ImportError:
    MEMORY_AVAILABLE = False
    print("Warning: Memory system not available")


# Enhanced State Schema with memory context
class AgentState(TypedDict):
    """
    The state schema that flows through the LangGraph workflow.
    This maintains context across all agent interactions.
    Enhanced with memory system integration.
    """
    messages: Annotated[List[Dict[str, str]], add_messages]
    user_id: str
    session_id: str  # Added for memory tracking
    language: str
    visual_requested: bool
    next_step: str
    rag_context: str
    search_results: str
    # Memory-related state
    memory_context: str  # Populated from memory system
    user_profile: Dict[str, Any]  # User's learning profile
    effective_strategies: List[Dict[str, Any]]  # What works for this user
    current_topic: Optional[str]  # Currently discussed topic
    extracted_facts: List[Dict[str, str]]  # Facts to store after interaction


# Initialize Gemini LLM
def get_llm(model: str = None):
    """
    Get the Gemini model instance.
    Default: gemini-2.5-pro (configurable via GEMINI_MODEL env var)
    
    Rate limits for free tier:
    - gemini-2.5-pro: 2 RPM, 50 RPD (requests per day)
    - gemini-2.0-flash: 15 RPM, 1500 RPD
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    model_name = model or os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.7,
        convert_system_message_to_human=True,
    )


# Hugging Face Inference API for Gemma-3-27b-it (FREE!)
HUGGINGFACE_API_URL = "https://router.huggingface.co/novita/v3/openai/chat/completions"
HUGGINGFACE_MODEL = "google/gemma-3-27b-it"

async def call_huggingface_llm(messages: List[Dict[str, str]], max_tokens: int = 2048) -> str:
    """
    Call Hugging Face Inference API with Gemma-3-27b-it model.
    This is 100% FREE with a Hugging Face account!
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        max_tokens: Maximum tokens to generate
        
    Returns:
        Generated text response
    """
    hf_token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
    
    if not hf_token:
        raise ValueError("HUGGINGFACE_API_KEY or HF_TOKEN environment variable not set")
    
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": HUGGINGFACE_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.7,
        "stream": False
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            HUGGINGFACE_API_URL,
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            error_text = response.text
            raise Exception(f"Hugging Face API error {response.status_code}: {error_text}")
        
        result = response.json()
        return result["choices"][0]["message"]["content"]


def call_huggingface_llm_sync(messages: List[Dict[str, str]], max_tokens: int = 2048) -> str:
    """
    Synchronous version of Hugging Face API call.
    """
    import httpx
    
    hf_token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
    
    if not hf_token:
        raise ValueError("HUGGINGFACE_API_KEY or HF_TOKEN environment variable not set")
    
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": HUGGINGFACE_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.7,
        "stream": False
    }
    
    with httpx.Client(timeout=120.0) as client:
        response = client.post(
            HUGGINGFACE_API_URL,
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            error_text = response.text
            raise Exception(f"Hugging Face API error {response.status_code}: {error_text}")
        
        result = response.json()
        return result["choices"][0]["message"]["content"]


def get_message_content(msg) -> str:
    """Extract content from a message (handles both dict and LangChain message objects)"""
    if isinstance(msg, dict):
        return msg.get("content", "")
    elif hasattr(msg, "content"):
        return msg.content
    else:
        return str(msg)


def get_message_role(msg) -> str:
    """Extract role from a message (handles both dict and LangChain message objects)"""
    if isinstance(msg, dict):
        return msg.get("role", "user")
    elif isinstance(msg, HumanMessage):
        return "user"
    elif isinstance(msg, AIMessage):
        return "assistant"
    elif isinstance(msg, SystemMessage):
        return "system"
    elif hasattr(msg, "type"):
        return "user" if msg.type == "human" else "assistant"
    else:
        return "user"


def auto_select_tool(message: str) -> str:
    """
    Auto-select the best tool based on user message.
    Uses pattern matching (NO LLM call) for instant routing.
    """
    message_lower = message.lower()
    
    # Diagram patterns (check first - more specific)
    diagram_patterns = [
        "diagram", "flowchart", "flow chart", "block diagram",
        "process diagram", "svg", "chart", "hierarchy",
        "org chart", "organization chart", "tree diagram",
        "sequence diagram", "architecture diagram", "system diagram",
        "create a diagram", "draw a diagram", "make a flowchart",
        "visualize the process", "show the flow", "workflow diagram"
    ]
    
    # Image generation patterns
    image_patterns = [
        "generate image", "create image", "draw a picture", "make an image",
        "generate a picture", "create a picture", "illustrate",
        "generate art", "create art", "make art", "artwork",
        "image of", "picture of", "photo of", "painting of",
        "render", "design an image", "generate visual",
        "stable diffusion", "ai image", "ai art", "realistic image"
    ]
    
    # Report patterns
    report_patterns = [
        "report", "document", "detailed analysis", "comprehensive",
        "write about", "research paper", "essay", "thesis",
        "summarize in detail", "full explanation", "in-depth",
        "generate a report", "create a document", "write a paper"
    ]
    
    # Presentation patterns
    presentation_patterns = [
        "presentation", "ppt", "powerpoint", "slides", "slide deck",
        "create slides", "make a presentation", "design slides",
        "keynote", "pitch deck", "slideshow"
    ]
    
    # Check for diagram (most specific first)
    for pattern in diagram_patterns:
        if pattern in message_lower:
            return "diagram"
    
    # Check for image generation
    for pattern in image_patterns:
        if pattern in message_lower:
            return "image"
    
    # Check for report
    for pattern in report_patterns:
        if pattern in message_lower:
            return "report"
    
    # Check for presentation
    for pattern in presentation_patterns:
        if pattern in message_lower:
            return "presentation"
    
    # Default to chat
    return "chat"


async def load_memory_context(user_id: str, session_id: str, query: str) -> Dict[str, Any]:
    """Load memory context for a user query."""
    if not MEMORY_AVAILABLE:
        return {
            "memory_context": "",
            "user_profile": {},
            "effective_strategies": [],
            "current_topic": None,
        }
    
    try:
        manager = MemoryManager(user_id, session_id)
        context = await manager.build_context_for_query(query)
        memory_str = await get_memory_context(user_id, session_id, query)
        
        return {
            "memory_context": memory_str,
            "user_profile": context.get("user_profile", {}),
            "effective_strategies": context.get("effective_strategies", []),
            "current_topic": context.get("current_topic"),
        }
    except Exception as e:
        print(f"Error loading memory context: {e}")
        return {
            "memory_context": "",
            "user_profile": {},
            "effective_strategies": [],
            "current_topic": None,
        }


async def save_interaction_memory(
    user_id: str,
    session_id: str,
    user_message: str,
    assistant_response: str,
    topic: Optional[str] = None,
    was_helpful: Optional[bool] = None,
    extracted_facts: Optional[List[Dict[str, str]]] = None
):
    """Save interaction to memory system."""
    if not MEMORY_AVAILABLE:
        return
    
    try:
        manager = MemoryManager(user_id, session_id)
        await manager.process_interaction(
            user_message=user_message,
            assistant_response=assistant_response,
            topic=topic,
            was_helpful=was_helpful,
            extracted_facts=extracted_facts
        )
    except Exception as e:
        print(f"Error saving memory: {e}")


# Supervisor Node - Routes to appropriate agent
def supervisor_node(state: AgentState) -> AgentState:
    """
    The Supervisor analyzes user intent and routes to the appropriate agent.
    Uses efficient pattern matching instead of LLM to save API quota.
    """
    messages = state["messages"]
    last_message = get_message_content(messages[-1]) if messages else ""
    last_message_lower = last_message.lower()
    
    # Pattern-based routing to save LLM API calls
    agent_name = "tutor"  # Default
    
    # RAG patterns - questions about uploaded documents
    rag_patterns = [
        "my document", "the document", "uploaded file", "uploaded document",
        "the textbook", "my textbook", "this pdf", "the pdf", "my file",
        "from the document", "in the document", "according to the document",
        "based on the document", "what does the document say", "the file says"
    ]
    
    # Visual patterns - requests for images/diagrams
    visual_patterns = [
        "show me", "draw", "diagram", "image", "picture", "visualize",
        "visual", "illustration", "chart", "graph", "sketch", "figure",
        "can you show", "create an image", "make a diagram", "generate image"
    ]
    
    # Presentation patterns - slide creation
    presentation_patterns = [
        "presentation", "slides", "slide deck", "powerpoint", "ppt",
        "create slides", "make slides", "make a presentation",
        "create a presentation", "slideshow"
    ]
    
    # Feynman patterns - user wants to explain/teach
    feynman_patterns = [
        "let me explain", "i'll explain", "i will explain", "i want to explain",
        "let me teach", "i'll teach", "i understand it as", "my understanding is",
        "here's how i see it", "in my words", "can i explain", "test my understanding"
    ]
    
    # Advocate/debate patterns - critical thinking exercises
    advocate_patterns = [
        "debate", "argue", "devil's advocate", "counter argument", "play devil",
        "challenge my", "disagree with", "opposing view", "other side",
        "what's wrong with", "critique", "critical thinking"
    ]
    
    # Check patterns in order of specificity
    for pattern in rag_patterns:
        if pattern in last_message_lower:
            agent_name = "rag"
            break
    
    if agent_name == "tutor":  # Only check if not already assigned
        for pattern in presentation_patterns:
            if pattern in last_message_lower:
                agent_name = "presentation"
                break
    
    if agent_name == "tutor":
        for pattern in visual_patterns:
            if pattern in last_message_lower:
                agent_name = "visual"
                break
    
    if agent_name == "tutor":
        for pattern in feynman_patterns:
            if pattern in last_message_lower:
                agent_name = "feynman"
                break
    
    if agent_name == "tutor":
        for pattern in advocate_patterns:
            if pattern in last_message_lower:
                agent_name = "advocate"
                break
    
    state["next_step"] = agent_name
    return state


# Tutor Node - Main educational agent
def tutor_node(state: AgentState) -> AgentState:
    """
    The core Socratic Tutor agent.
    Uses guided questioning to help students construct knowledge.
    Enhanced with memory-driven personalization.
    """
    llm = get_llm()
    
    messages = state["messages"]
    language = state.get("language", "en")
    search_context = state.get("search_results", "")
    memory_context = state.get("memory_context", "")
    user_profile = state.get("user_profile", {})
    effective_strategies = state.get("effective_strategies", [])
    current_topic = state.get("current_topic", "")
    
    # Build personalized teaching approach based on memory
    personalization = ""
    if user_profile:
        if user_profile.get("challenges"):
            personalization += f"\n- Known challenges to address: {', '.join(user_profile['challenges'][:3])}"
        if user_profile.get("proficiencies"):
            personalization += f"\n- Subject proficiencies: {user_profile['proficiencies']}"
    
    # Include effective strategies
    strategy_hints = ""
    if effective_strategies:
        strategies = [s["description"] for s in effective_strategies[:3]]
        strategy_hints = f"\n\nPREVIOUSLY EFFECTIVE APPROACHES FOR THIS USER:\n{chr(10).join(strategies)}"
    
    system_prompt = f"""You are an expert Socratic tutor aligned with SDG 4 (Quality Education).
    Your role is to guide students to discover answers themselves, not just provide information.

    TEACHING APPROACH:
    1. When a student asks a question, first acknowledge their curiosity
    2. Instead of giving the answer directly, ask guiding questions
    3. Use analogies and real-world examples to make concepts relatable
    4. Break complex topics into smaller, digestible pieces
    5. Encourage critical thinking and reflection
    6. Celebrate progress and correct misconceptions gently

    PERSONALIZATION FOR THIS STUDENT:{personalization if personalization else " No specific profile data yet - adapt based on their responses."}
    {strategy_hints}
    
    {memory_context if memory_context else ""}
    
    {f"CURRENT TOPIC CONTEXT: We've been discussing {current_topic}" if current_topic else ""}

    LANGUAGE: Respond primarily in {language}. For technical terms, provide both the English term and a {language} explanation if different.
    
    FORMATTING:
    - Use markdown for structure (headers, bullet points, code blocks)
    - Keep paragraphs short and scannable
    - Use emojis sparingly to make content engaging 📚
    
    {f"RELEVANT CONTEXT FROM WEB SEARCH: {search_context}" if search_context else ""}
    
    IMPORTANT: After your response, if you learn something new about this student's:
    - Learning preferences (visual, auditory, hands-on)
    - Subject strengths or weaknesses
    - Interests or goals
    Include it in a hidden section like: <!--FACT:category:fact-->
    
    Remember: Your goal is to develop understanding, not just transmit information."""
    
    # Build message history for context
    chat_messages = [SystemMessage(content=system_prompt)]
    for msg in messages[-10:]:  # Keep last 10 messages for context
        if get_message_role(msg) == "user":
            chat_messages.append(HumanMessage(content=get_message_content(msg)))
        else:
            chat_messages.append(AIMessage(content=get_message_content(msg)))
    
    response = llm.invoke(chat_messages)
    
    # Extract any facts from the response
    response_content = response.content
    extracted_facts = []
    import re
    fact_matches = re.findall(r'<!--FACT:(\w+):(.+?)-->', response_content)
    for category, fact in fact_matches:
        extracted_facts.append({"category": category, "fact": fact})
        # Remove fact markers from visible response
        response_content = response_content.replace(f"<!--FACT:{category}:{fact}-->", "")
    
    # Add response to messages
    state["messages"].append({
        "role": "assistant",
        "content": response_content.strip()
    })
    
    # Store extracted facts for memory system
    if extracted_facts:
        state["extracted_facts"] = extracted_facts
    
    state["next_step"] = END
    return state


# RAG Node - Document-grounded responses
def rag_node(state: AgentState) -> AgentState:
    """
    Retrieval-Augmented Generation agent.
    Grounds responses in uploaded documents to reduce hallucination.
    Enhanced with memory for contextual document responses.
    """
    llm = get_llm()
    
    messages = state["messages"]
    rag_context = state.get("rag_context", "")
    memory_context = state.get("memory_context", "")
    user_profile = state.get("user_profile", {})
    
    # Personalization based on user profile
    explanation_style = ""
    if user_profile:
        if "visual" in user_profile.get("learning_style", []):
            explanation_style = "Include visual descriptions and diagram suggestions where helpful."
        if user_profile.get("challenges"):
            explanation_style += f" Be extra clear when explaining topics related to: {', '.join(user_profile['challenges'][:2])}"
    
    system_prompt = f"""You are an educational assistant that answers questions based STRICTLY on provided document context.
    
    RULES:
    1. Only answer based on the provided context
    2. If the context doesn't contain relevant information, say so clearly
    3. Quote relevant passages when appropriate
    4. Cite page numbers or sections if available in metadata
    5. Never make up information not in the context
    
    {f"PERSONALIZATION: {explanation_style}" if explanation_style else ""}
    
    {memory_context if memory_context else ""}
    
    DOCUMENT CONTEXT:
    {rag_context if rag_context else "No document has been uploaded. Please ask the user to upload a document first."}
    
    If context is empty, politely inform the user they need to upload a document to get grounded answers."""
    
    chat_messages = [SystemMessage(content=system_prompt)]
    for msg in messages[-5:]:
        if get_message_role(msg) == "user":
            chat_messages.append(HumanMessage(content=get_message_content(msg)))
        else:
            chat_messages.append(AIMessage(content=get_message_content(msg)))
    
    response = llm.invoke(chat_messages)
    
    state["messages"].append({
        "role": "assistant", 
        "content": response.content
    })
    state["next_step"] = END
    return state


# Visual Node - Image generation agent
def visual_node(state: AgentState) -> AgentState:
    """
    Visual Analogist agent.
    Generates descriptive prompts for educational diagrams and visualizations.
    Enhanced with memory for personalized visual learning.
    """
    llm = get_llm()
    
    messages = state["messages"]
    last_message = get_message_content(messages[-1]) if messages else ""
    user_profile = state.get("user_profile", {})
    memory_context = state.get("memory_context", "")
    
    # Adapt visual style based on user preferences
    visual_style = ""
    if user_profile:
        if user_profile.get("interests"):
            visual_style = f"Try to incorporate examples from: {', '.join(user_profile['interests'][:2])}"
        if "technical" in str(user_profile.get("proficiencies", {})):
            visual_style += " Can include more technical diagrams with detailed labels."
    
    system_prompt = f"""You are a visual learning specialist who creates educational diagrams.
    
    YOUR TASK:
    1. Analyze what concept the user is trying to understand
    2. Design a simple, clear visual that explains it
    3. Generate a detailed image prompt for an AI image generator
    4. Explain how the visual connects to the concept
    
    {f"PERSONALIZATION: {visual_style}" if visual_style else ""}
    
    {memory_context if memory_context else ""}
    
    IMAGE PROMPT GUIDELINES:
    - Be specific and detailed
    - Use terms like "educational diagram", "labeled illustration", "schematic"
    - Keep it simple and clean - avoid clutter
    - Focus on one main concept
    
    FORMAT YOUR RESPONSE AS:
    **Visual Explanation for: [Concept]**
    
    ![Visual](<image_url_will_be_here>)
    
    **How to read this diagram:**
    [Explanation of visual elements]
    
    Generate the image prompt inside the markdown image syntax like this:
    ![description](https://image.pollinations.ai/prompt/YOUR_DETAILED_PROMPT_HERE)
    
    URL-encode spaces as %20 in the prompt."""
    
    chat_messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=last_message)
    ]
    
    response = llm.invoke(chat_messages)
    
    state["messages"].append({
        "role": "assistant",
        "content": response.content
    })
    state["visual_requested"] = True
    state["next_step"] = END
    return state


# Presentation Node - Slide generation
def presentation_node(state: AgentState) -> AgentState:
    """
    Presentation Generator agent.
    Creates structured JSON for PowerPoint slides on any topic.
    Enhanced with memory for personalized presentation style.
    """
    llm = get_llm()
    
    messages = state["messages"]
    last_message = get_message_content(messages[-1]) if messages else ""
    user_profile = state.get("user_profile", {})
    effective_strategies = state.get("effective_strategies", [])
    
    # Customize presentation style
    style_guidance = ""
    if user_profile:
        if user_profile.get("interests"):
            style_guidance = f"Include examples related to: {', '.join(user_profile['interests'][:2])}"
        level = "beginner" if not user_profile.get("proficiencies") else "intermediate to advanced"
        style_guidance += f" Target the content for {level} level."
    
    # Check effective strategies for presentation preferences
    for strategy in effective_strategies:
        if "visual" in strategy.get("description", "").lower():
            style_guidance += " Include more visual slide prompts."
            break
    
    system_prompt = f"""You are an expert at creating educational presentations.
    
    Create a 5-7 slide presentation on the requested topic.
    
    {f"PERSONALIZATION: {style_guidance}" if style_guidance else ""}
    
    RESPOND WITH VALID JSON in this exact format:
    ```json
    {{
      "slides": [
        {{
          "title": "Presentation Title",
          "body": "Subtitle or brief description",
          "imagePrompt": null
        }},
        {{
          "title": "First Topic",
          "body": "- Key point 1\\n- Key point 2\\n- Key point 3",
          "imagePrompt": "educational diagram of concept, simple, clean, labeled"
        }}
      ]
    }}
    ```
    
    GUIDELINES:
    - First slide is always the title slide
    - Each content slide should have 3-5 bullet points
    - Include an imagePrompt for visual slides (or null if text-only)
    - Keep content concise and educational
    - Use clear, simple language
    
    RESPOND ONLY WITH THE JSON, no additional text."""
    
    chat_messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Create a presentation about: {last_message}")
    ]
    
    response = llm.invoke(chat_messages)
    
    # Parse the JSON from the response
    try:
        content = response.content
        # Extract JSON from markdown code block if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        
        slides_data = json.loads(content.strip())
        
        # Format response with slides
        formatted_response = f"""📊 **Presentation Created!**

I've generated a {len(slides_data.get('slides', []))}-slide presentation for you.

Click the **View Slides** button in the workspace panel to preview and download your PowerPoint file.

**Slides Overview:**
"""
        for i, slide in enumerate(slides_data.get("slides", [])):
            formatted_response += f"\n{i+1}. **{slide.get('title', 'Untitled')}**"
        
        state["messages"].append({
            "role": "assistant",
            "content": formatted_response,
            "metadata": {"slideData": slides_data.get("slides", [])}
        })
        
    except json.JSONDecodeError:
        state["messages"].append({
            "role": "assistant",
            "content": "I apologize, but I had trouble generating the slides. Let me try explaining the topic instead.\n\n" + response.content
        })
    
    state["next_step"] = END
    return state


# Feynman Node - Reverse teaching mode
def feynman_node(state: AgentState) -> AgentState:
    """
    Feynman Technique Evaluator agent.
    User explains concepts to the AI, which acts as a curious novice.
    Enhanced with memory to track explanation progress.
    """
    llm = get_llm()
    
    messages = state["messages"]
    user_profile = state.get("user_profile", {})
    memory_context = state.get("memory_context", "")
    
    # Adapt based on what user has successfully explained before
    progress_note = ""
    if user_profile.get("proficiencies"):
        strong_areas = [k for k, v in user_profile.get("proficiencies", {}).items() if isinstance(v, dict) and v.get("level") == "high"]
        if strong_areas:
            progress_note = f"The user has shown strong understanding in: {', '.join(strong_areas)}. Challenge them more in these areas."
    
    system_prompt = f"""You are implementing the Feynman Technique for learning.
    
    YOUR ROLE: Act as a curious, intelligent novice who wants to learn.
    
    {f"CONTEXT: {progress_note}" if progress_note else ""}
    
    {memory_context if memory_context else ""}
    
    WHEN USER EXPLAINS SOMETHING:
    1. Listen carefully to their explanation
    2. Identify any jargon, gaps, or unclear analogies
    3. Ask ONE specific, probing question that exposes a gap
    4. Don't correct them directly - let them discover errors through your questions
    
    QUESTION TYPES:
    - "What do you mean by [technical term]?"
    - "How does [X] connect to [Y] you mentioned?"
    - "Can you give me a simple example of that?"
    - "What would happen if [edge case]?"
    
    NEVER:
    - Give the answer yourself
    - Say they're wrong directly
    - Ask more than one question at a time
    
    If their explanation is complete and clear, congratulate them! 🎉
    
    Also note if they've improved in explaining this topic compared to before."""
    
    chat_messages = [SystemMessage(content=system_prompt)]
    for msg in messages[-8:]:
        if get_message_role(msg) == "user":
            chat_messages.append(HumanMessage(content=get_message_content(msg)))
        else:
            chat_messages.append(AIMessage(content=get_message_content(msg)))
    
    response = llm.invoke(chat_messages)
    
    state["messages"].append({
        "role": "assistant",
        "content": response.content
    })
    state["next_step"] = END
    return state


# Devil's Advocate Node - Critical thinking
def advocate_node(state: AgentState) -> AgentState:
    """
    Devil's Advocate agent for critical thinking exercises.
    Challenges user's positions to strengthen argumentation skills.
    Enhanced with memory to adapt debate difficulty.
    """
    llm = get_llm()
    
    messages = state["messages"]
    user_profile = state.get("user_profile", {})
    memory_context = state.get("memory_context", "")
    effective_strategies = state.get("effective_strategies", [])
    
    # Adapt debate style based on user's debating history
    debate_style = ""
    if user_profile:
        if user_profile.get("interests"):
            debate_style = f"Can use examples from: {', '.join(user_profile['interests'][:2])}"
    
    # Check if we know how intense to make the debate
    for strategy in effective_strategies:
        if "debate" in strategy.get("topic", "").lower() or "critical" in strategy.get("topic", "").lower():
            if strategy.get("success_rate", 0) > 0.7:
                debate_style += " Increase challenge level - user responds well to rigorous debate."
            break
    
    system_prompt = f"""You are a Devil's Advocate for educational debate practice.
    
    YOUR MISSION:
    1. Take the opposing viewpoint to the user's position
    2. Present well-researched, logical counter-arguments
    3. Challenge their assumptions respectfully
    4. Score their rebuttals on logic and evidence (not agreement)
    
    {f"STYLE ADJUSTMENTS: {debate_style}" if debate_style else ""}
    
    {memory_context if memory_context else ""}
    
    RULES:
    - Be intellectually rigorous but not combative
    - Cite real-world examples and data when possible
    - Acknowledge strong points in their argument
    - Focus on developing their critical thinking skills
    
    FORMAT:
    **🎭 Devil's Advocate Response**
    
    *[Your persona/perspective]*
    
    [Your counter-argument]
    
    **Challenge Question:** [A question that probes their position]
    
    ---
    *Remember: This is an exercise in critical thinking, not a personal debate.*"""
    
    chat_messages = [SystemMessage(content=system_prompt)]
    for msg in messages[-8:]:
        if get_message_role(msg) == "user":
            chat_messages.append(HumanMessage(content=get_message_content(msg)))
        else:
            chat_messages.append(AIMessage(content=get_message_content(msg)))
    
    response = llm.invoke(chat_messages)
    
    state["messages"].append({
        "role": "assistant",
        "content": response.content
    })
    state["next_step"] = END
    return state


# Router function for conditional edges
def route_to_agent(state: AgentState) -> str:
    """Route to the appropriate agent based on supervisor decision"""
    return state.get("next_step", "tutor")


# Build the LangGraph workflow
def create_tutor_graph() -> StateGraph:
    """
    Creates and compiles the LangGraph workflow for the AI Tutor.
    """
    # Initialize the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("tutor", tutor_node)
    workflow.add_node("rag", rag_node)
    workflow.add_node("visual", visual_node)
    workflow.add_node("presentation", presentation_node)
    workflow.add_node("feynman", feynman_node)
    workflow.add_node("advocate", advocate_node)
    
    # Set entry point
    workflow.set_entry_point("supervisor")
    
    # Add conditional edges from supervisor to specialized agents
    workflow.add_conditional_edges(
        "supervisor",
        route_to_agent,
        {
            "tutor": "tutor",
            "rag": "rag",
            "visual": "visual",
            "presentation": "presentation",
            "feynman": "feynman",
            "advocate": "advocate",
        }
    )
    
    # All agents end the workflow after processing
    workflow.add_edge("tutor", END)
    workflow.add_edge("rag", END)
    workflow.add_edge("visual", END)
    workflow.add_edge("presentation", END)
    workflow.add_edge("feynman", END)
    workflow.add_edge("advocate", END)
    
    # Compile and return
    return workflow.compile()
