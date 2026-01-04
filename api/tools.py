"""
LangGraph Tools for the Agentic AI Tutor
Defines tools that agents can use for web search, RAG, and visual generation
"""

from typing import List, Dict, Any, Optional
from langchain_core.tools import tool
from .services.search import web_search, format_search_results_for_context
from .services.document import search_documents
import urllib.parse


@tool
async def search_web(query: str) -> str:
    """
    Search the web for information using DuckDuckGo.
    Use this when you need up-to-date information or facts to verify.
    
    Args:
        query: The search query
    
    Returns:
        Formatted search results
    """
    results = await web_search(query, max_results=5)
    return format_search_results_for_context(results)


@tool
async def search_documents_rag(query: str) -> str:
    """
    Search uploaded documents for relevant information.
    Use this when the user asks about their uploaded materials.
    
    Args:
        query: The search query
    
    Returns:
        Relevant document excerpts
    """
    results = await search_documents(query, match_threshold=0.6, match_count=3)
    
    if not results:
        return "No relevant documents found. The user may need to upload materials first."
    
    formatted = []
    for i, doc in enumerate(results, 1):
        metadata = doc.get('metadata', {})
        source = metadata.get('filename', 'Unknown source')
        page = metadata.get('page', 'N/A')
        
        formatted.append(f"""
[Document {i}]
Source: {source} (Page {page})
Content: {doc.get('content', '')}
Relevance: {doc.get('similarity', 0):.2%}
""".strip())
    
    return "\n\n".join(formatted)


@tool
def generate_visual(concept: str, style: str = "educational diagram") -> str:
    """
    Generate a visual representation of a concept.
    Use this when a student needs to visualize something.
    
    Args:
        concept: The concept to visualize
        style: The visual style (e.g., "diagram", "infographic", "schematic")
    
    Returns:
        Markdown image link to the generated visual
    """
    # Create a detailed prompt for Pollinations.ai
    prompt = f"{concept}, {style}, clean, labeled, educational, simple, white background"
    encoded_prompt = urllib.parse.quote(prompt)
    
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512"
    
    return f"![{concept}]({url})"


@tool
def create_quiz_question(topic: str, difficulty: str = "medium") -> Dict[str, Any]:
    """
    Create a quiz question to test understanding.
    
    Args:
        topic: The topic to create a question about
        difficulty: easy, medium, or hard
    
    Returns:
        A quiz question with options and correct answer
    """
    # This is a template - the LLM will fill in actual content
    return {
        "type": "multiple_choice",
        "topic": topic,
        "difficulty": difficulty,
        "question": "[LLM will generate question]",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
        "explanation": "[LLM will provide explanation]"
    }


@tool
def generate_analogy(concept: str, target_audience: str = "general") -> str:
    """
    Generate an analogy to explain a complex concept.
    
    Args:
        concept: The concept that needs explanation
        target_audience: Who the analogy is for (e.g., "children", "students", "general")
    
    Returns:
        An analogy explanation
    """
    return f"Generate a relatable analogy for '{concept}' suitable for {target_audience}"


@tool
def create_study_plan(topic: str, duration_days: int = 7) -> Dict[str, Any]:
    """
    Create a structured study plan for a topic.
    
    Args:
        topic: The subject to study
        duration_days: How many days the plan should span
    
    Returns:
        A structured study plan
    """
    return {
        "topic": topic,
        "duration": f"{duration_days} days",
        "plan": "[LLM will generate detailed day-by-day plan]"
    }


@tool
def create_calendar_event(title: str, date: str, description: str = "") -> Dict[str, Any]:
    """
    Create a calendar event for the user's learning schedule.
    Use this when the user wants to schedule a study session, set a deadline, 
    or mark an important date.
    
    Args:
        title: The title of the event (e.g., "Study Physics Chapter 3")
        date: The date in YYYY-MM-DD format
        description: Optional description of the event
    
    Returns:
        A calendar event object that the frontend will sync with Google Calendar
    """
    return {
        "action": "create",
        "title": title,
        "date": date,
        "description": description,
        "type": "calendar_event"
    }


@tool
def create_learning_goal(title: str, due_date: str = "", description: str = "") -> Dict[str, Any]:
    """
    Create a learning goal for the user with an optional deadline.
    Use this when the user mentions goals, objectives, or things they want to achieve.
    
    Args:
        title: The goal title (e.g., "Master quadratic equations")
        due_date: Optional deadline in YYYY-MM-DD format
        description: Optional description of the goal
    
    Returns:
        A learning goal object
    """
    return {
        "action": "create_goal",
        "title": title,
        "dueDate": due_date,
        "description": description,
        "type": "learning_goal"
    }


@tool
def generate_document_content(topic: str, document_type: str = "notes") -> Dict[str, Any]:
    """
    Generate document content that the user can export.
    Use this when the user asks for notes, summaries, study guides, etc.
    
    Args:
        topic: The topic to create content about
        document_type: Type of document (notes, summary, study_guide, essay_outline)
    
    Returns:
        Document metadata - the actual content is generated by the LLM
    """
    return {
        "type": "document",
        "document_type": document_type,
        "topic": topic,
        "exportable": True
    }


# List of all available tools
TUTOR_TOOLS = [
    search_web,
    search_documents_rag,
    generate_visual,
    create_quiz_question,
    generate_analogy,
    create_study_plan,
    create_calendar_event,
    create_learning_goal,
    generate_document_content,
]


def get_tools_for_agent(agent_type: str) -> List:
    """
    Get the appropriate tools for a specific agent type.
    
    Args:
        agent_type: The type of agent (tutor, rag, visual, etc.)
    
    Returns:
        List of tools appropriate for that agent
    """
    tool_mapping = {
        "tutor": [search_web, generate_analogy, create_quiz_question, create_calendar_event, create_learning_goal],
        "rag": [search_documents_rag, generate_document_content],
        "visual": [generate_visual],
        "presentation": [],  # Presentation uses internal logic
        "feynman": [create_quiz_question],
        "advocate": [search_web, create_learning_goal],
    }
    
    return tool_mapping.get(agent_type, [])
