"""
Agentic AI Memory System
Implements multiple memory types for context-aware tutoring:
- Episodic Memory: Specific past interactions and events
- Semantic Memory: General knowledge and facts about the user
- Procedural Memory: Learned patterns and teaching strategies
- Working Memory: Current conversation context
"""

import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib

# Supabase client
from supabase import create_client, Client

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def get_supabase() -> Client:
    """Get Supabase client."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


class MemoryType(str, Enum):
    EPISODIC = "episodic"      # Specific events and interactions
    SEMANTIC = "semantic"      # Facts and knowledge about user
    PROCEDURAL = "procedural"  # Learned patterns and strategies
    WORKING = "working"        # Current session context


class ImportanceLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class MemoryItem:
    """Represents a single memory item."""
    id: str
    user_id: str
    memory_type: MemoryType
    content: str
    context: Dict[str, Any]
    importance: ImportanceLevel
    timestamp: datetime
    last_accessed: datetime
    access_count: int
    decay_factor: float  # For memory consolidation
    embedding: Optional[List[float]] = None
    related_memories: Optional[List[str]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            **asdict(self),
            "memory_type": self.memory_type.value,
            "importance": self.importance.value,
            "timestamp": self.timestamp.isoformat(),
            "last_accessed": self.last_accessed.isoformat(),
        }


class EpisodicMemory:
    """
    Stores specific past interactions and events.
    - Conversation summaries
    - Learning milestones
    - Emotional states during learning
    - Successful explanations
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.supabase = get_supabase()
    
    async def store_episode(
        self,
        session_id: str,
        content: str,
        context: Dict[str, Any],
        importance: ImportanceLevel = ImportanceLevel.MEDIUM
    ) -> str:
        """Store a new episodic memory."""
        memory_id = hashlib.sha256(
            f"{self.user_id}:{session_id}:{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()[:16]
        
        memory_data = {
            "id": memory_id,
            "user_id": self.user_id,
            "memory_type": MemoryType.EPISODIC.value,
            "session_id": session_id,
            "content": content,
            "context": json.dumps(context),
            "importance": importance.value,
            "recorded_at": datetime.utcnow().isoformat(),
            "last_accessed": datetime.utcnow().isoformat(),
            "access_count": 0,
            "decay_factor": 1.0,
        }
        
        try:
            self.supabase.table("memories").insert(memory_data).execute()
        except Exception as e:
            print(f"Error storing episodic memory: {e}")
        
        return memory_id
    
    async def recall_episodes(
        self,
        query: str,
        limit: int = 5,
        time_range_days: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Recall relevant episodic memories."""
        query_builder = self.supabase.table("memories").select("*").eq(
            "user_id", self.user_id
        ).eq("memory_type", MemoryType.EPISODIC.value)
        
        if time_range_days:
            cutoff = (datetime.utcnow() - timedelta(days=time_range_days)).isoformat()
            query_builder = query_builder.gte("recorded_at", cutoff)
        
        result = query_builder.order("recorded_at", desc=True).limit(limit).execute()
        
        # Update access count for retrieved memories
        for memory in result.data:
            self._update_access(memory["id"])
        
        return result.data
    
    async def get_session_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all memories from a specific session."""
        result = self.supabase.table("memories").select("*").eq(
            "user_id", self.user_id
        ).eq("session_id", session_id).order("recorded_at", desc=False).execute()
        
        return result.data
    
    def _update_access(self, memory_id: str):
        """Update memory access statistics."""
        try:
            self.supabase.table("memories").update({
                "last_accessed": datetime.utcnow().isoformat(),
                "access_count": self.supabase.rpc(
                    "increment_access_count", {"memory_id": memory_id}
                ).execute()
            }).eq("id", memory_id).execute()
        except:
            pass  # Non-critical operation


class SemanticMemory:
    """
    Stores general knowledge and facts about the user.
    - Learning preferences
    - Subject proficiency levels
    - Known concepts
    - Misconceptions to address
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.supabase = get_supabase()
    
    async def store_fact(
        self,
        category: str,
        fact: str,
        confidence: float = 0.8,
        source_session: Optional[str] = None
    ) -> str:
        """Store a semantic fact about the user."""
        memory_id = hashlib.sha256(
            f"{self.user_id}:semantic:{category}:{fact[:50]}".encode()
        ).hexdigest()[:16]
        
        # Check if similar fact exists and update instead
        existing = self.supabase.table("memories").select("id").eq(
            "user_id", self.user_id
        ).eq("memory_type", MemoryType.SEMANTIC.value).ilike(
            "content", f"%{fact[:30]}%"
        ).execute()
        
        if existing.data:
            # Update existing fact with higher confidence
            self.supabase.table("memories").update({
                "context": json.dumps({
                    "category": category,
                    "confidence": min(confidence + 0.1, 1.0),
                    "source_session": source_session,
                    "updated_at": datetime.utcnow().isoformat()
                }),
                "last_accessed": datetime.utcnow().isoformat(),
            }).eq("id", existing.data[0]["id"]).execute()
            return existing.data[0]["id"]
        
        memory_data = {
            "id": memory_id,
            "user_id": self.user_id,
            "memory_type": MemoryType.SEMANTIC.value,
            "content": fact,
            "context": json.dumps({
                "category": category,
                "confidence": confidence,
                "source_session": source_session
            }),
            "importance": ImportanceLevel.HIGH.value,
            "recorded_at": datetime.utcnow().isoformat(),
            "last_accessed": datetime.utcnow().isoformat(),
            "access_count": 0,
            "decay_factor": 1.0,
        }
        
        try:
            self.supabase.table("memories").insert(memory_data).execute()
        except Exception as e:
            print(f"Error storing semantic memory: {e}")
        
        return memory_id
    
    async def get_user_profile(self) -> Dict[str, Any]:
        """Get comprehensive user profile from semantic memory."""
        result = self.supabase.table("memories").select("*").eq(
            "user_id", self.user_id
        ).eq("memory_type", MemoryType.SEMANTIC.value).execute()
        
        profile = {
            "learning_style": [],
            "proficiencies": {},
            "interests": [],
            "challenges": [],
            "preferences": {},
            "raw_facts": []
        }
        
        for memory in result.data:
            context = json.loads(memory.get("context", "{}"))
            category = context.get("category", "general")
            
            if category == "learning_style":
                profile["learning_style"].append(memory["content"])
            elif category == "proficiency":
                # Parse proficiency level
                parts = memory["content"].split(":")
                if len(parts) == 2:
                    profile["proficiencies"][parts[0].strip()] = parts[1].strip()
            elif category == "interest":
                profile["interests"].append(memory["content"])
            elif category == "challenge":
                profile["challenges"].append(memory["content"])
            elif category == "preference":
                profile["preferences"][memory["content"]] = context.get("value", True)
            else:
                profile["raw_facts"].append(memory["content"])
        
        return profile
    
    async def update_proficiency(
        self,
        subject: str,
        level: str,
        evidence: str
    ):
        """Update user's proficiency in a subject."""
        await self.store_fact(
            category="proficiency",
            fact=f"{subject}: {level}",
            confidence=0.85,
            source_session=evidence
        )
    
    async def record_learning_preference(self, preference: str, value: Any):
        """Record a learning preference."""
        await self.store_fact(
            category="preference",
            fact=preference,
            confidence=0.9
        )


class ProceduralMemory:
    """
    Stores learned patterns and successful teaching strategies.
    - Effective explanation patterns for this user
    - Question types that work well
    - Pacing preferences
    - Error patterns to avoid
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.supabase = get_supabase()
    
    async def store_procedure(
        self,
        procedure_type: str,
        description: str,
        success_rate: float,
        context: Dict[str, Any]
    ) -> str:
        """Store a learned procedure or pattern."""
        memory_id = hashlib.sha256(
            f"{self.user_id}:procedural:{procedure_type}:{description[:30]}".encode()
        ).hexdigest()[:16]
        
        # Check for existing similar procedure
        existing = self.supabase.table("memories").select("*").eq(
            "user_id", self.user_id
        ).eq("memory_type", MemoryType.PROCEDURAL.value).ilike(
            "content", f"%{description[:20]}%"
        ).execute()
        
        if existing.data:
            # Update success rate using exponential moving average
            old_context = json.loads(existing.data[0].get("context", "{}"))
            old_rate = old_context.get("success_rate", 0.5)
            new_rate = 0.7 * success_rate + 0.3 * old_rate
            old_context["success_rate"] = new_rate
            old_context["use_count"] = old_context.get("use_count", 0) + 1
            
            self.supabase.table("memories").update({
                "context": json.dumps(old_context),
                "last_accessed": datetime.utcnow().isoformat(),
            }).eq("id", existing.data[0]["id"]).execute()
            return existing.data[0]["id"]
        
        memory_data = {
            "id": memory_id,
            "user_id": self.user_id,
            "memory_type": MemoryType.PROCEDURAL.value,
            "content": description,
            "context": json.dumps({
                "procedure_type": procedure_type,
                "success_rate": success_rate,
                "use_count": 1,
                **context
            }),
            "importance": ImportanceLevel.HIGH.value if success_rate > 0.7 else ImportanceLevel.MEDIUM.value,
            "recorded_at": datetime.utcnow().isoformat(),
            "last_accessed": datetime.utcnow().isoformat(),
            "access_count": 0,
            "decay_factor": 1.0,
        }
        
        try:
            self.supabase.table("memories").insert(memory_data).execute()
        except Exception as e:
            print(f"Error storing procedural memory: {e}")
        
        return memory_id
    
    async def get_effective_strategies(
        self,
        context_type: Optional[str] = None,
        min_success_rate: float = 0.6
    ) -> List[Dict[str, Any]]:
        """Get effective teaching strategies for this user."""
        query = self.supabase.table("memories").select("*").eq(
            "user_id", self.user_id
        ).eq("memory_type", MemoryType.PROCEDURAL.value)
        
        result = query.execute()
        
        strategies = []
        for memory in result.data:
            context = json.loads(memory.get("context", "{}"))
            if context.get("success_rate", 0) >= min_success_rate:
                if context_type is None or context.get("procedure_type") == context_type:
                    strategies.append({
                        "description": memory["content"],
                        "success_rate": context.get("success_rate", 0),
                        "use_count": context.get("use_count", 0),
                        "type": context.get("procedure_type", "general")
                    })
        
        # Sort by success rate * use_count for reliability
        strategies.sort(key=lambda x: x["success_rate"] * min(x["use_count"], 10), reverse=True)
        return strategies[:10]
    
    async def record_explanation_outcome(
        self,
        topic: str,
        explanation_style: str,
        was_successful: bool,
        feedback: Optional[str] = None
    ):
        """Record the outcome of an explanation attempt."""
        success_rate = 1.0 if was_successful else 0.0
        
        await self.store_procedure(
            procedure_type="explanation",
            description=f"For {topic}: {explanation_style}",
            success_rate=success_rate,
            context={
                "topic": topic,
                "style": explanation_style,
                "feedback": feedback
            }
        )


class WorkingMemory:
    """
    Short-term memory for current conversation context.
    - Recent messages
    - Current topic focus
    - Active goals
    - Temporary context
    """
    
    def __init__(self, user_id: str, session_id: str, max_items: int = 20):
        self.user_id = user_id
        self.session_id = session_id
        self.max_items = max_items
        self.supabase = get_supabase()
        self._cache: Dict[str, Any] = {}
    
    async def add_to_context(self, key: str, value: Any, ttl_minutes: int = 60):
        """Add item to working memory."""
        self._cache[key] = {
            "value": value,
            "expires": datetime.utcnow() + timedelta(minutes=ttl_minutes)
        }
        
        # Also persist to database for cross-request persistence
        memory_data = {
            "id": f"wm:{self.session_id}:{key}",
            "user_id": self.user_id,
            "memory_type": MemoryType.WORKING.value,
            "session_id": self.session_id,
            "content": key,
            "context": json.dumps({"value": value, "ttl_minutes": ttl_minutes}),
            "importance": ImportanceLevel.LOW.value,
            "recorded_at": datetime.utcnow().isoformat(),
            "last_accessed": datetime.utcnow().isoformat(),
            "access_count": 0,
            "decay_factor": 1.0,
        }
        
        try:
            self.supabase.table("memories").upsert(memory_data).execute()
        except:
            pass
    
    async def get_from_context(self, key: str) -> Optional[Any]:
        """Get item from working memory."""
        # Check cache first
        if key in self._cache:
            item = self._cache[key]
            if item["expires"] > datetime.utcnow():
                return item["value"]
            else:
                del self._cache[key]
        
        # Check database
        result = self.supabase.table("memories").select("*").eq(
            "id", f"wm:{self.session_id}:{key}"
        ).execute()
        
        if result.data:
            context = json.loads(result.data[0].get("context", "{}"))
            return context.get("value")
        
        return None
    
    async def get_conversation_summary(self) -> str:
        """Get a summary of the current conversation context."""
        # Get recent messages from this session
        result = self.supabase.table("messages").select(
            "role, content"
        ).eq("session_id", self.session_id).order(
            "created_at", desc=True
        ).limit(10).execute()
        
        if not result.data:
            return "No previous context in this conversation."
        
        summary_parts = []
        for msg in reversed(result.data):
            role = "User" if msg["role"] == "user" else "Assistant"
            content = msg["content"][:200] + "..." if len(msg["content"]) > 200 else msg["content"]
            summary_parts.append(f"{role}: {content}")
        
        return "\n".join(summary_parts)
    
    async def set_current_topic(self, topic: str):
        """Set the current topic being discussed."""
        await self.add_to_context("current_topic", topic, ttl_minutes=120)
    
    async def get_current_topic(self) -> Optional[str]:
        """Get the current topic being discussed."""
        return await self.get_from_context("current_topic")
    
    async def set_learning_goal(self, goal: str):
        """Set the current learning goal."""
        await self.add_to_context("learning_goal", goal, ttl_minutes=180)
    
    async def clear_session(self):
        """Clear all working memory for this session."""
        self._cache.clear()
        try:
            self.supabase.table("memories").delete().eq(
                "session_id", self.session_id
            ).eq("memory_type", MemoryType.WORKING.value).execute()
        except:
            pass


class MemoryManager:
    """
    Unified memory manager that coordinates all memory systems.
    Implements memory consolidation, retrieval, and context building.
    """
    
    def __init__(self, user_id: str, session_id: str):
        self.user_id = user_id
        self.session_id = session_id
        self.episodic = EpisodicMemory(user_id)
        self.semantic = SemanticMemory(user_id)
        self.procedural = ProceduralMemory(user_id)
        self.working = WorkingMemory(user_id, session_id)
    
    async def build_context_for_query(
        self,
        query: str,
        include_profile: bool = True,
        include_history: bool = True,
        include_strategies: bool = True,
        max_episodes: int = 5
    ) -> Dict[str, Any]:
        """
        Build comprehensive context for processing a user query.
        This is the main method used by agents to get relevant context.
        """
        context = {
            "query": query,
            "recorded_at": datetime.utcnow().isoformat(),
            "session_id": self.session_id,
        }
        
        # Get user profile from semantic memory
        if include_profile:
            context["user_profile"] = await self.semantic.get_user_profile()
        
        # Get relevant episodes
        if include_history:
            episodes = await self.episodic.recall_episodes(query, limit=max_episodes)
            context["relevant_history"] = [
                {
                    "content": ep["content"],
                    "recorded_at": ep["recorded_at"],
                    "context": json.loads(ep.get("context", "{}"))
                }
                for ep in episodes
            ]
        
        # Get effective teaching strategies
        if include_strategies:
            strategies = await self.procedural.get_effective_strategies()
            context["effective_strategies"] = strategies[:5]
        
        # Get working memory context
        context["current_topic"] = await self.working.get_current_topic()
        context["conversation_summary"] = await self.working.get_conversation_summary()
        
        return context
    
    async def process_interaction(
        self,
        user_message: str,
        assistant_response: str,
        topic: Optional[str] = None,
        was_helpful: Optional[bool] = None,
        extracted_facts: Optional[List[Dict[str, str]]] = None
    ):
        """
        Process an interaction and update all memory systems.
        Called after each successful interaction.
        """
        # Store episodic memory
        await self.episodic.store_episode(
            session_id=self.session_id,
            content=f"User asked about: {user_message[:100]}... Response covered: {assistant_response[:100]}...",
            context={
                "topic": topic,
                "helpful": was_helpful,
                "message_length": len(user_message),
                "response_length": len(assistant_response)
            },
            importance=ImportanceLevel.MEDIUM
        )
        
        # Update working memory with current topic
        if topic:
            await self.working.set_current_topic(topic)
        
        # Store any extracted facts to semantic memory
        if extracted_facts:
            for fact in extracted_facts:
                await self.semantic.store_fact(
                    category=fact.get("category", "general"),
                    fact=fact.get("fact", ""),
                    source_session=self.session_id
                )
        
        # If we know the interaction was helpful, record procedural memory
        if was_helpful is not None:
            # Extract explanation style from response
            explanation_style = self._detect_explanation_style(assistant_response)
            await self.procedural.record_explanation_outcome(
                topic=topic or "general",
                explanation_style=explanation_style,
                was_successful=was_helpful
            )
    
    def _detect_explanation_style(self, response: str) -> str:
        """Detect the explanation style used in a response."""
        styles = []
        
        if "?" in response[:200]:
            styles.append("socratic")
        if "example" in response.lower() or "for instance" in response.lower():
            styles.append("example-based")
        if "1." in response or "•" in response or "- " in response:
            styles.append("structured-list")
        if "imagine" in response.lower() or "think of" in response.lower():
            styles.append("analogy")
        if "```" in response:
            styles.append("code-example")
        if "![" in response:
            styles.append("visual")
        
        return ", ".join(styles) if styles else "direct-explanation"
    
    async def consolidate_memories(self):
        """
        Consolidate memories - move important working memories to long-term,
        decay old episodic memories, strengthen frequently accessed ones.
        This should be called periodically (e.g., end of session).
        """
        # Get session summary and store as episodic memory
        summary = await self.working.get_conversation_summary()
        if summary and summary != "No previous context in this conversation.":
            await self.episodic.store_episode(
                session_id=self.session_id,
                content=f"Session summary: {summary[:500]}",
                context={"type": "session_summary"},
                importance=ImportanceLevel.HIGH
            )
        
        # Clear working memory for this session
        await self.working.clear_session()
    
    async def get_cross_session_context(
        self,
        topic: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get context from previous sessions on the same or related topics.
        Useful for continuity across learning sessions.
        """
        episodes = await self.episodic.recall_episodes(
            query=topic or "",
            limit=limit,
            time_range_days=30  # Look back 30 days
        )
        
        # Filter and organize by session
        sessions = {}
        for ep in episodes:
            session_id = ep.get("session_id", "unknown")
            if session_id not in sessions:
                sessions[session_id] = []
            sessions[session_id].append(ep)
        
        return [
            {
                "session_id": sid,
                "episodes": eps,
                "recorded_at": eps[0]["recorded_at"] if eps else None
            }
            for sid, eps in sessions.items()
        ]


# Helper function for agents to use
async def get_memory_context(user_id: str, session_id: str, query: str) -> str:
    """
    Get formatted memory context for use in agent prompts.
    Returns a string that can be directly included in the system prompt.
    """
    manager = MemoryManager(user_id, session_id)
    context = await manager.build_context_for_query(query)
    
    # Format as readable context
    parts = []
    
    # User profile
    profile = context.get("user_profile", {})
    if profile.get("learning_style"):
        parts.append(f"Learning Style: {', '.join(profile['learning_style'])}")
    if profile.get("proficiencies"):
        prof_str = ", ".join([f"{k}: {v}" for k, v in profile["proficiencies"].items()])
        parts.append(f"Subject Proficiencies: {prof_str}")
    if profile.get("interests"):
        parts.append(f"Interests: {', '.join(profile['interests'][:5])}")
    if profile.get("challenges"):
        parts.append(f"Known Challenges: {', '.join(profile['challenges'][:3])}")
    
    # Current context
    if context.get("current_topic"):
        parts.append(f"Current Topic: {context['current_topic']}")
    
    # Effective strategies
    strategies = context.get("effective_strategies", [])
    if strategies:
        strat_str = "; ".join([s["description"] for s in strategies[:3]])
        parts.append(f"Effective Teaching Approaches: {strat_str}")
    
    # Relevant history
    history = context.get("relevant_history", [])
    if history:
        hist_str = " | ".join([h["content"][:100] for h in history[:3]])
        parts.append(f"Relevant Past Interactions: {hist_str}")
    
    if parts:
        return "=== USER MEMORY CONTEXT ===\n" + "\n".join(parts) + "\n=== END CONTEXT ==="
    
    return ""
