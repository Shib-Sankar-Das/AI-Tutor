import { redirect } from 'next/navigation';
import { v4 as uuidv4 } from 'crypto';

export default function ChatPage() {
  // Generate a new session ID and redirect
  const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  redirect(`/chat/${sessionId}`);
}
