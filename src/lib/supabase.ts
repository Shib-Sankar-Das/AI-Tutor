import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Profile {
  id: string;
  full_name: string;
  grade: string;
  language: string;
  preferences: {
    voiceEnabled: boolean;
    preferredVoice: string;
    visualLearner: boolean;
    dyslexicFont: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  content: string;
  metadata: {
    filename: string;
    page?: number;
    chunk_index?: number;
  };
  embedding: number[];
  user_id: string;
  created_at: string;
}

export interface Checkpoint {
  thread_id: string;
  checkpoint: Record<string, any>;
  checkpoint_ns: string;
  checkpoint_id: string;
  created_at: string;
}

// Helper functions
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return data;
}

export async function searchDocuments(
  queryEmbedding: number[],
  matchThreshold: number = 0.7,
  matchCount: number = 5
): Promise<Document[]> {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error('Error searching documents:', error);
    return [];
  }

  return data || [];
}

export async function insertDocument(
  content: string,
  embedding: number[],
  metadata: Document['metadata'],
  userId: string
): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      content,
      embedding,
      metadata,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting document:', error);
    return null;
  }

  return data;
}

export async function saveCheckpoint(
  threadId: string,
  checkpoint: Record<string, any>,
  checkpointId: string
): Promise<boolean> {
  const { error } = await supabase.from('checkpoints').upsert({
    thread_id: threadId,
    checkpoint,
    checkpoint_ns: '',
    checkpoint_id: checkpointId,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Error saving checkpoint:', error);
    return false;
  }

  return true;
}

export async function getCheckpoint(
  threadId: string
): Promise<Checkpoint | null> {
  const { data, error } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching checkpoint:', error);
    return null;
  }

  return data;
}
