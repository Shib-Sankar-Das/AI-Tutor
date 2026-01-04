# Agentic AI Tutor 🎓

An intelligent, multi-agent AI tutoring system aligned with **UN SDG 4: Quality Education**. Built with Next.js, FastAPI, LangGraph, and Google Gemini 1.5 Flash.

![AI Tutor Banner](https://image.pollinations.ai/prompt/modern%20AI%20education%20platform%20interface%2C%20student%20learning%2C%20digital%2C%20clean%20design?width=1200&height=400)

## 🌟 Features

### Agentic AI Capabilities
- **🎯 Socratic Tutoring**: Guides students through questions rather than giving direct answers
- **📊 Presentation Generator**: Creates PowerPoint slides from any topic (client-side generation)
- **🖼️ Visual Learning**: AI-generated diagrams and visualizations using Pollinations.ai
- **🔍 RAG (Retrieval-Augmented Generation)**: Upload textbooks and get grounded answers
- **🗣️ Voice Interaction**: Speech-to-text input and text-to-speech output
- **🌐 Multilingual Support**: Learn in your preferred language with code-switching
- **🎭 Devil's Advocate**: Critical thinking exercises for debate practice
- **📚 Feynman Technique**: Reverse teaching mode where you explain concepts to the AI

### Google Integration 🔗
- **🔐 Google OAuth**: Sign in with Google for seamless authentication
- **📅 Google Calendar**: Sync learning goals and deadlines with your calendar
- **📑 Google Slides Export**: Export presentations directly to Google Slides
- **📝 Google Docs Export**: Export notes and documents directly to Google Docs
- **📥 Multi-format Downloads**: Download as PPTX, DOCX, or PDF

### Dashboard Features 📊
- **📆 Interactive Calendar**: View and manage your study schedule
- **🎯 Learning Goals**: Set, track, and complete learning objectives
- **⏰ Due Date Management**: Never miss a deadline with calendar reminders
- **💬 Chat Integration**: Create goals and events directly through chat

### Technical Highlights
- **100% Free Tier**: All services use free tiers (Vercel, Supabase, Google AI)
- **Streaming Responses**: Real-time token streaming for responsive UX
- **Long-term Memory**: Conversation persistence with Supabase
- **Vector Search**: Semantic document search with pgvector

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 14, React, Tailwind CSS, Zustand |
| **Backend** | FastAPI (Python) on Vercel Serverless |
| **AI/LLM** | Google Gemini 1.5 Flash |
| **Orchestration** | LangGraph (Cyclic Workflows) |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Authentication** | Supabase Auth + Google OAuth |
| **Voice TTS** | Edge-TTS (Microsoft Neural Voices) |
| **Voice STT** | Web Speech API (Browser) |
| **Images** | Pollinations.ai (Free AI Image Generation) |
| **PPT Generation** | PptxGenJS (Client-side) |
| **Doc Generation** | docx.js, jsPDF (Client-side) |
| **Web Search** | DuckDuckGo Search |
| **Calendar/Slides/Docs** | Google APIs (Calendar, Slides, Docs) |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account (free tier)
- Google AI Studio API key (free)
- Google Cloud Console project (for OAuth & Google APIs)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/agentic-ai-tutor.git
cd agentic-ai-tutor

# Install Node dependencies
npm install

# Install Python dependencies
pip install -r api/requirements.txt
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini
GOOGLE_API_KEY=your-google-api-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable these APIs:
   - Google Calendar API
   - Google Slides API
   - Google Docs API
   - Google Drive API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)
7. Copy Client ID and Client Secret
8. In Supabase Dashboard → Authentication → Providers → Google:
   - Enable Google provider
   - Add Client ID and Client Secret
   - Add the additional scopes for Calendar, Slides, and Docs

### 4. Database Setup

Run the SQL schema in your Supabase SQL Editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Then run the full schema from supabase/schema.sql
```

### 5. Run Development Server

```bash
# Start the Next.js development server
npm run dev

# In a separate terminal, run the FastAPI backend (optional for local dev)
cd api
uvicorn index:app --reload --port 8000
```

Visit `http://localhost:3000` to see the app!

## 📁 Project Structure

```
agentic-ai-tutor/
├── api/                        # FastAPI Backend
│   ├── agents/
│   │   └── supervisor.py       # LangGraph multi-agent system
│   ├── services/
│   │   ├── tts.py              # Edge-TTS service
│   │   ├── document.py         # PDF processing & RAG
│   │   └── search.py           # DuckDuckGo search
│   ├── index.py                # FastAPI app entry
│   ├── tools.py                # Agent tools (search, calendar, etc.)
│   └── requirements.txt
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Dashboard with calendar & goals
│   │   ├── chat/
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx    # Main chat interface
│   │   ├── auth/               # Authentication pages
│   │   │   ├── login/          # Login with Google OAuth
│   │   │   ├── signup/         # Sign up page
│   │   │   └── callback/       # OAuth callback handler
│   │   └── settings/           # User settings
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── VoiceControl.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── WorkspacePanel.tsx
│   │   │   ├── SlideDeck.tsx   # PPT with Google Slides export
│   │   │   └── DocumentExport.tsx # Doc export (Docs, DOCX, PDF)
│   │   └── ui/
│   └── lib/
│       ├── store.ts            # Zustand state management
│       ├── supabase.ts         # Supabase client
│       └── google-auth.ts      # Google OAuth & API integration
├── supabase/
│   └── schema.sql              # Database schema
├── vercel.json                 # Vercel deployment config
└── package.json
```

## 🧠 Agent Architecture

The AI Tutor uses a **Supervisor-based multi-agent architecture** powered by LangGraph:

```
                    ┌─────────────────┐
                    │   User Input    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Supervisor    │
                    │   (Router)      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
   │  Tutor  │         │   RAG   │         │ Visual  │
   │  Agent  │         │  Agent  │         │  Agent  │
   └─────────┘         └─────────┘         └─────────┘
        │                    │                    │
   ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
   │ Feynman │         │ Present │         │Advocate │
   │  Agent  │         │  Agent  │         │  Agent  │
   └─────────┘         └─────────┘         └─────────┘
```

## 🎯 Usage Examples

### Socratic Learning
```
User: "Explain photosynthesis"
AI: "Before I explain, let me ask - what do you already know about 
     how plants get their energy? 🌱"
```

### Visual Generation
```
User: "Show me a diagram of the human heart"
AI: "Here's a visual representation of the heart's anatomy..."
[Generates image via Pollinations.ai]
```

### Presentation Mode
```
User: "Create a presentation about renewable energy"
AI: "📊 I've created a 6-slide presentation for you. 
     Click 'View Slides' to preview and download!"
     [Export to Google Slides | Download PPTX | Download PDF]
```

### Calendar Integration
```
User: "Set a goal to finish calculus chapter 5 by Friday"
AI: "🎯 I've created a learning goal for you!
     'Complete Calculus Chapter 5' due on Friday.
     [Add to Google Calendar]"
```

### Document Export
```
User: "Give me notes on World War 2"
AI: "## World War 2 - Key Notes
     ### Causes
     - Treaty of Versailles...
     ### Major Events...
     [Export to Google Docs | Download DOCX | Download PDF]"
```

### Feynman Technique
```
User: "I want to practice explaining quantum entanglement"
AI: "Great! I'll be your curious student 🎓
     Go ahead and explain quantum entanglement to me like 
     I've never heard of it before..."
```

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

```bash
# Or deploy via CLI
npm i -g vercel
vercel --prod
```

### Vercel Configuration Notes

- Function timeout is set to 60 seconds in `vercel.json`
- Python backend runs as serverless functions
- Streaming responses bypass timeout limits

## 📊 Free Tier Limits

| Service | Limit |
|---------|-------|
| Vercel Hobby | 100GB bandwidth, 60s function timeout |
| Supabase Free | 500MB database, 2GB storage |
| Google Gemini | 15 RPM, 1,500 requests/day |
| Edge-TTS | Unlimited (no API key needed) |
| Pollinations.ai | Unlimited (rate-limited by IP) |
| DuckDuckGo | Rate-limited (no hard limit) |

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- CSRBOX & IBM SkillsBuild for the Capstone opportunity
- United Nations SDG 4 for the inspiring mission
- All open-source contributors

---

**Built with ❤️ for Quality Education | SDG 4**
