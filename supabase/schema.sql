-- Agentic AI Tutor - Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable the pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- HELPER FUNCTIONS (must be defined before triggers)
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- USER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    grade TEXT,
    language TEXT DEFAULT 'en',
    preferences JSONB DEFAULT '{
        "voiceEnabled": true,
        "preferredVoice": "en-US-AriaNeural",
        "visualLearner": false,
        "dyslexicFont": false
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================
-- DOCUMENTS TABLE (for RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(768),  -- Gemini embedding dimension
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
    ON documents 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Enable RLS on documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Documents policies (users can only access their own documents)
CREATE POLICY "Users can view their own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
    ON documents FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================
-- SEMANTIC SEARCH FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id BIGINT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        documents.id,
        documents.content,
        documents.metadata,
        1 - (documents.embedding <=> query_embedding) AS similarity
    FROM documents
    WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
    ORDER BY documents.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


-- ============================================
-- LANGGRAPH CHECKPOINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint JSONB NOT NULL,
    checkpoint_ns TEXT DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (thread_id, checkpoint_id)
);

-- Index for faster thread lookups
CREATE INDEX IF NOT EXISTS checkpoints_thread_idx 
    ON checkpoints(thread_id, created_at DESC);


-- ============================================
-- CHECKPOINT WRITES TABLE (for pending writes)
-- ============================================
CREATE TABLE IF NOT EXISTS checkpoint_writes (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    idx INT NOT NULL,
    channel TEXT NOT NULL,
    type TEXT,
    value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (thread_id, checkpoint_id, task_id, idx)
);


-- ============================================
-- CHAT SESSIONS TABLE (optional - for analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    last_message TEXT,
    message_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
    ON chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
    ON chat_sessions FOR ALL
    USING (auth.uid() = user_id);


-- ============================================
-- LEARNING PROGRESS TABLE (for tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS learning_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    scaffolding_level INT DEFAULT 3,  -- 1-5, decreases as mastery increases
    mastery_score FLOAT DEFAULT 0,
    interactions_count INT DEFAULT 0,
    last_interaction TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
    ON learning_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
    ON learning_progress FOR ALL
    USING (auth.uid() = user_id);


-- ============================================
-- MEMORIES TABLE (Agentic Memory System)
-- ============================================
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('episodic', 'semantic', 'procedural', 'working')),
    session_id TEXT,
    content TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    importance TEXT DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high', 'critical')),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    access_count INT DEFAULT 0,
    decay_factor FLOAT DEFAULT 1.0,
    embedding vector(768),
    related_memories TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for memory queries
CREATE INDEX IF NOT EXISTS memories_user_type_idx ON memories(user_id, memory_type);
CREATE INDEX IF NOT EXISTS memories_session_idx ON memories(session_id);
CREATE INDEX IF NOT EXISTS memories_timestamp_idx ON memories(recorded_at DESC);
CREATE INDEX IF NOT EXISTS memories_importance_idx ON memories(importance);

-- Vector index for semantic search on memories
CREATE INDEX IF NOT EXISTS memories_embedding_idx 
    ON memories 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Enable RLS on memories
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memories"
    ON memories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories"
    ON memories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
    ON memories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
    ON memories FOR DELETE
    USING (auth.uid() = user_id);

-- Function to increment access count
CREATE OR REPLACE FUNCTION increment_access_count(memory_id TEXT)
RETURNS INT AS $$
DECLARE
    new_count INT;
BEGIN
    UPDATE memories 
    SET access_count = access_count + 1,
        last_accessed = NOW()
    WHERE id = memory_id
    RETURNING access_count INTO new_count;
    RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- Function to apply memory decay (reduces importance of old, unused memories)
CREATE OR REPLACE FUNCTION apply_memory_decay()
RETURNS void AS $$
BEGIN
    UPDATE memories
    SET decay_factor = GREATEST(0.1, decay_factor * 0.95)
    WHERE memory_type IN ('episodic', 'procedural')
    AND last_accessed < NOW() - INTERVAL '7 days'
    AND importance != 'critical';
END;
$$ LANGUAGE plpgsql;

-- Function to search memories semantically
CREATE OR REPLACE FUNCTION search_memories(
    p_user_id UUID,
    query_embedding vector(768),
    p_memory_type TEXT DEFAULT NULL,
    match_threshold FLOAT DEFAULT 0.6,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id TEXT,
    memory_type TEXT,
    content TEXT,
    context JSONB,
    importance TEXT,
    recorded_at TIMESTAMPTZ,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.memory_type,
        m.content,
        m.context,
        m.importance,
        m.recorded_at,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM memories m
    WHERE m.user_id = p_user_id
    AND (p_memory_type IS NULL OR m.memory_type = p_memory_type)
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


-- ============================================
-- MESSAGES TABLE (for chat history)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for message queries
CREATE INDEX IF NOT EXISTS messages_session_idx ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS messages_user_idx ON messages(user_id);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
    ON messages FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================
-- TOPIC CONTEXT TABLE (for cross-session learning)
-- ============================================
CREATE TABLE IF NOT EXISTS topic_contexts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    subtopics TEXT[],
    summary TEXT,
    key_concepts JSONB DEFAULT '[]',
    misconceptions JSONB DEFAULT '[]',
    proficiency_level TEXT DEFAULT 'beginner',
    total_sessions INT DEFAULT 0,
    total_interactions INT DEFAULT 0,
    last_session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, topic)
);

-- Enable RLS
ALTER TABLE topic_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own topic contexts"
    ON topic_contexts FOR ALL
    USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_topic_contexts_updated_at ON topic_contexts;
CREATE TRIGGER update_topic_contexts_updated_at
    BEFORE UPDATE ON topic_contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- APPLY TRIGGERS TO TABLES
-- ============================================

-- Apply to profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply to chat_sessions table
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- SAMPLE DATA (optional - for testing)
-- ============================================
-- Uncomment to add sample data for testing

-- INSERT INTO documents (content, metadata, embedding) VALUES
-- ('Sample educational content about photosynthesis...', 
--  '{"filename": "biology_ch1.pdf", "page": 1}',
--  '[0.1, 0.2, ...]'::vector(768));
