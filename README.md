# Agentic AI Tutor 🎓

An intelligent, multi-agent AI tutoring system aligned with **UN SDG 4: Quality Education**. Built with Next.js, FastAPI, and powered by **Hugging Face's Gemma-3-27b-it** model with **Stable Diffusion 3.5 Large** for image generation.

![AI Tutor Banner](https://img.shields.io/badge/AI%20Tutor-SDG%204%20Quality%20Education-blue?style=for-the-badge&logo=graduation-cap)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Hugging Face](https://img.shields.io/badge/🤗%20Hugging%20Face-Gemma%203%2027B-yellow?style=for-the-badge)
![Stable Diffusion](https://img.shields.io/badge/SD%203.5-Large-purple?style=for-the-badge)

## 🌟 Key Highlights

- **100% FREE** - Uses Hugging Face Inference API (unlimited, no cost)
- **No Rate Limits** - Unlike paid APIs, enjoy unlimited conversations
- **6 Powerful Tools** - Auto, Chat, Report, PPT, Diagram, and Image generation
- **Real-time Streaming** - See responses as they're generated
- **Export Everything** - Google Docs, Slides, DOCX, PDF, SVG, PNG

---

## 📚 Table of Contents

1. [Features Overview](#-features-overview)
2. [Tool System](#-tool-system-detailed)
3. [Tech Stack](#-tech-stack)
4. [Architecture](#-architecture)
5. [Getting Started](#-getting-started)
6. [Project Structure](#-project-structure)
7. [API Reference](#-api-reference)
8. [Deployment](#-deployment)
9. [Contributing](#-contributing)

---

## 🌟 Features Overview

### 🤖 AI-Powered Learning
| Feature | Description |
|---------|-------------|
| **Socratic Tutoring** | Guides students through questions rather than giving direct answers |
| **Adaptive Learning** | Remembers your learning style and preferences across sessions |
| **Multi-language Support** | Learn in any language with automatic translation |
| **Context-Aware** | Uses conversation history for coherent, contextual responses |

### 🛠️ Six Powerful Tools
| Tool | Icon | Purpose |
|------|------|---------|
| **Auto** | 🤖 | AI automatically selects the best tool for your query |
| **Chat** | 💬 | General conversation and tutoring |
| **Report** | 📄 | Generate comprehensive multi-page reports |
| **PPT** | 📊 | Create professional presentations with images |
| **Diagram** | 📈 | Generate SVG diagrams with code editor |
| **Image** | 🖼️ | Create images using Stable Diffusion 3.5 |

### 🔗 Google Integration
- **Google OAuth** - Secure sign-in with Google account
- **Google Calendar** - Sync learning goals and study schedules
- **Google Slides Export** - Direct export presentations to Google Slides
- **Google Docs Export** - Export notes and documents to Google Docs

### 📊 Dashboard Features
- **Interactive Calendar** - Visual study schedule management
- **Learning Goals** - Set, track, and complete objectives
- **Progress Tracking** - Monitor your learning journey
- **Due Date Reminders** - Never miss a deadline

---

## 🔧 Tool System (Detailed)

### 1. 🤖 Auto Mode (Smart Routing)
The AI automatically analyzes your query and selects the most appropriate tool:

```
"Explain photosynthesis" → Chat (tutoring)
"Create slides about AI" → PPT (presentation)
"Draw a flowchart of..." → Diagram (SVG generation)
"Generate an image of..." → Image (SD 3.5)
"Write a report on..." → Report (detailed document)
```

**How it works:**
- Pattern matching for keywords (presentation, diagram, image, report)
- Context analysis for intent detection
- Fallback to Chat for general queries

---

### 2. 💬 Chat Mode (AI Tutoring)

The default conversational mode for learning and tutoring.

**Features:**
- Socratic questioning methodology
- Markdown formatting support
- Code syntax highlighting
- Memory of past conversations
- Adaptive teaching style

**Example Interaction:**
```
User: "Explain quantum entanglement"
AI: "Before I explain, let me ask - what do you know about how 
     particles can be connected across distances? 🔬"
```

**Pedagogical Approaches:**
- **Feynman Technique**: Explain concepts back to the AI
- **Devil's Advocate**: Critical thinking through debate
- **Scaffolded Learning**: Building on existing knowledge

---

### 3. 📄 Report Mode (Document Generator)

Generate comprehensive, well-structured reports on any topic.

**Features:**
- Multi-section format with headings
- Executive summary
- Bullet points and numbered lists
- Data and evidence inclusion
- Proper citations format
- 1000+ words comprehensive coverage

**Output Structure:**
```markdown
## Executive Summary
Brief overview of the topic...

## Introduction
Background and context...

## Main Content
### Section 1
Detailed analysis...

### Section 2
Supporting information...

## Conclusion
Key takeaways and recommendations...
```

**Export Options:**
| Format | Description |
|--------|-------------|
| Google Docs | Direct export with formatting |
| DOCX | Microsoft Word compatible |
| PDF | Professional document format |

---

### 4. 📊 PPT Mode (Presentation Generator)

Create professional, visually appealing presentations with AI-generated images.

**Features:**
- 7-10 slides for comprehensive coverage
- Modern template design with gradients
- Automatic bullet point formatting
- AI-generated images using Stable Diffusion 3.5
- Parallel image generation (fast!)

**Slide Structure:**
```
Slide 1: Title Slide
├── Main title (from your topic)
├── Subtitle (descriptive tagline)
└── Date

Slide 2: Overview/Agenda
├── Bullet point 1
├── Bullet point 2
└── ...

Slides 3-8: Content Slides
├── Section title
├── 4-5 bullet points with details
└── AI-generated image (if requested)

Final Slide: Summary & Key Takeaways
├── Main conclusions
└── Call to action
```

**Template Design:**
- **Color Palette**: Blue (#2563EB), Purple (#7C3AED), Green (#059669)
- **Gradient Headers**: Professional gradient backgrounds
- **Slide Numbers**: Automatic numbering
- **Modern Typography**: Clean Arial font

**Image Generation:**
- Only when explicitly requested in prompt
- Uses Stable Diffusion 3.5 Large
- Professional, minimalist style
- Generated in parallel (not sequential)

**Export Options:**
| Format | Description |
|--------|-------------|
| Google Slides | Direct export with full formatting |
| PPTX | Microsoft PowerPoint format |
| PDF | Via PowerPoint/Google Slides |

---

### 5. 📈 Diagram Mode (SVG Generator)

Create professional diagrams as editable SVG code.

**Features:**
- **Visual Preview**: See your diagram rendered instantly
- **Code Editor**: Edit SVG code directly
- **Syntax Validation**: Real-time error checking
- **Multiple Export Formats**: SVG, XML, PNG

**Supported Diagram Types:**
| Type | Description |
|------|-------------|
| Flowcharts | Process flows with decision points |
| Block Diagrams | System components and relationships |
| Hierarchy Charts | Organizational structures |
| Process Diagrams | Step-by-step workflows |
| Mind Maps | Concept relationships |
| Comparison Charts | Side-by-side analysis |

**Interface:**
```
┌─────────────────────────────────────────┐
│  [Preview] [Code]     [↻ Reset] [⛶ Full]│
├─────────────────────────────────────────┤
│                                         │
│         Visual Preview                  │
│         or                              │
│         Code Editor                     │
│                                         │
├─────────────────────────────────────────┤
│  [📋 Copy SVG] [📋 Copy XML]            │
│  [⬇️ SVG] [⬇️ XML] [⬇️ PNG]             │
└─────────────────────────────────────────┘
```

**SVG Styling:**
- Professional color palette
- Drop shadows for depth
- Rounded corners
- Clear text labels
- Responsive viewBox

---

### 6. 🖼️ Image Mode (Stable Diffusion 3.5)

Generate high-quality images using Stable Diffusion 3.5 Large.

**Features:**
- 1024x1024 resolution
- 28 inference steps for quality
- Negative prompt support
- Professional styling

**Model Details:**
| Property | Value |
|----------|-------|
| Model | stabilityai/stable-diffusion-3.5-large |
| Provider | Hugging Face Inference API |
| Resolution | 1024x1024 (customizable) |
| Steps | 28 (default) |
| Guidance Scale | 4.5 |

**Usage Examples:**
```
"Generate an image of a futuristic classroom"
"Create a diagram showing the water cycle"
"Make an illustration of DNA structure"
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **Zustand** | Lightweight state management |
| **Lucide Icons** | Beautiful icon set |

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | Python async API framework |
| **Vercel Serverless** | Serverless deployment |
| **Server-Sent Events** | Real-time streaming |

### AI/ML
| Technology | Purpose |
|------------|---------|
| **Hugging Face Inference API** | LLM hosting (FREE!) |
| **Gemma-3-27b-it** | Large language model |
| **Stable Diffusion 3.5 Large** | Image generation |

### Database & Auth
| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL + Auth |
| **pgvector** | Vector embeddings for RAG |
| **Google OAuth** | Social authentication |

### Export & Generation
| Technology | Purpose |
|------------|---------|
| **PptxGenJS** | PowerPoint generation |
| **docx** | Word document generation |
| **jsPDF** | PDF generation |
| **Google APIs** | Slides, Docs, Calendar |

### Voice
| Technology | Purpose |
|------------|---------|
| **Edge-TTS** | Text-to-speech (Microsoft Neural Voices) |
| **Web Speech API** | Speech-to-text (Browser) |

---

## 🏗️ Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │   Chat   │ │ Dashboard│ │ Settings │ │   Auth   │            │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
└───────┼────────────┼────────────┼────────────┼───────────────────┘
        │            │            │            │
        └────────────┴─────┬──────┴────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                    NEXT.JS FRONTEND                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │  Tool Selector  │ │  Chat Interface │ │  Export Panel   │    │
│  │  (6 Tools)      │ │  (Streaming)    │ │  (Multi-format) │    │
│  └────────┬────────┘ └────────┬────────┘ └────────┬────────┘    │
└───────────┼───────────────────┼───────────────────┼──────────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                │ SSE/HTTP
┌───────────────────────────────┼──────────────────────────────────┐
│                    FASTAPI BACKEND                               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │  Tool Router    │ │  LLM Service    │ │  Image Service  │    │
│  │  (Auto-select)  │ │  (HuggingFace)  │ │  (SD 3.5)       │    │
│  └────────┬────────┘ └────────┬────────┘ └────────┬────────┘    │
│           │                   │                   │              │
│  ┌────────┴───────────────────┴───────────────────┴────────┐    │
│  │                    Supervisor Agent                      │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │    │
│  │  │ Tutor  │ │  RAG   │ │ Visual │ │Present │            │    │
│  │  │ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │            │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘            │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────┼──────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ Hugging Face│ │  Supabase   │ │ Google APIs │                │
│  │ (LLM + SD)  │ │ (DB + Auth) │ │ (OAuth etc) │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
└──────────────────────────────────────────────────────────────────┘
```

### Tool Routing Flow

```
User Query
    │
    ▼
┌─────────────────┐
│  Tool Selector  │──── Manual Selection ────┐
└────────┬────────┘                          │
         │ Auto                              │
         ▼                                   │
┌─────────────────┐                          │
│ Pattern Matcher │                          │
│  • "diagram"    │                          │
│  • "flowchart"  │                          │
│  • "present"    │                          │
│  • "image"      │                          │
│  • "report"     │                          │
└────────┬────────┘                          │
         │                                   │
         ▼                                   │
┌─────────────────┐                          │
│  Route to Tool  │◄─────────────────────────┘
│  • chat         │
│  • report       │
│  • presentation │
│  • diagram      │
│  • image        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate Output │
│  (Streaming)    │
└─────────────────┘
```

### Data Flow

```
1. User Input → Frontend
2. Frontend → FastAPI (SSE Connection)
3. FastAPI → Tool Router
4. Tool Router → Hugging Face API
5. Hugging Face → Stream Response
6. FastAPI → Parse & Transform
7. Backend → Stream to Frontend
8. Frontend → Render Output
9. (Optional) → Export to Google/Download
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 18+ | Frontend runtime |
| Python | 3.9+ | Backend runtime |
| npm/yarn | Latest | Package management |

### Required Accounts (All Free)

1. **Hugging Face** - Get API token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. **Supabase** - Create project at [supabase.com](https://supabase.com)
3. **Google Cloud** - OAuth setup at [console.cloud.google.com](https://console.cloud.google.com)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Shib-Sankar-Das/AI-Tutor.git
cd agentic-ai-tutor

# 2. Install Node dependencies
npm install

# 3. Install Python dependencies
cd api
pip install -r requirements.txt
cd ..

# 4. Create environment file
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` in the root directory:

```env
# Hugging Face (FREE - Get token at huggingface.co/settings/tokens)
HUGGINGFACE_API_KEY=hf_your_token_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable APIs:
   - Google Calendar API
   - Google Slides API
   - Google Docs API
   - Google Drive API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (dev)
   - `https://your-domain.com/auth/callback` (prod)
6. Configure in Supabase Dashboard → Authentication → Providers → Google

### Database Setup

Run in Supabase SQL Editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Run the full schema from supabase/schema.sql
```

### Run Development Server

```bash
# Start Next.js (includes API routes)
npm run dev

# Visit http://localhost:3000
```

---

## 📁 Project Structure

```
agentic-ai-tutor/
├── 📂 api/                          # FastAPI Backend
│   ├── 📂 agents/
│   │   └── supervisor.py            # Multi-agent system & routing
│   ├── 📂 services/
│   │   ├── tts.py                   # Edge-TTS service
│   │   ├── document.py              # PDF processing & RAG
│   │   ├── memory.py                # Conversation memory
│   │   └── search.py                # DuckDuckGo search
│   ├── index.py                     # FastAPI main entry
│   ├── tools.py                     # Agent tools
│   └── requirements.txt             # Python dependencies
│
├── 📂 src/
│   ├── 📂 app/                      # Next.js App Router
│   │   ├── page.tsx                 # Landing page
│   │   ├── layout.tsx               # Root layout
│   │   ├── globals.css              # Global styles
│   │   ├── 📂 auth/
│   │   │   ├── 📂 login/            # Login page
│   │   │   ├── 📂 signup/           # Sign up page
│   │   │   └── 📂 callback/         # OAuth callback
│   │   ├── 📂 chat/
│   │   │   ├── page.tsx             # New chat
│   │   │   └── 📂 [sessionId]/      # Chat session
│   │   ├── 📂 dashboard/            # Dashboard with calendar
│   │   └── 📂 settings/             # User settings
│   │
│   ├── 📂 components/
│   │   ├── 📂 chat/
│   │   │   ├── ChatInterface.tsx    # Main chat component
│   │   │   ├── ChatMessage.tsx      # Message rendering
│   │   │   ├── ChatExport.tsx       # Full chat export
│   │   │   ├── ToolSelector.tsx     # 6-tool selector
│   │   │   ├── DiagramViewer.tsx    # SVG editor/viewer
│   │   │   ├── SlideDeck.tsx        # PPT viewer/export
│   │   │   ├── DocumentExport.tsx   # Doc export
│   │   │   ├── VoiceControl.tsx     # TTS/STT controls
│   │   │   ├── FileUpload.tsx       # Document upload
│   │   │   ├── ImageUpload.tsx      # Image upload
│   │   │   ├── Sidebar.tsx          # Chat history
│   │   │   ├── WorkspacePanel.tsx   # Side panel
│   │   │   └── MemoryProfile.tsx    # User memory
│   │   └── 📂 ui/
│   │       └── Toaster.tsx          # Notifications
│   │
│   └── 📂 lib/
│       ├── store.ts                 # Zustand state
│       ├── supabase.ts              # Supabase client
│       ├── google-auth.ts           # Google API integration
│       └── utils.ts                 # Utility functions
│
├── 📂 supabase/
│   └── schema.sql                   # Database schema
│
├── vercel.json                      # Vercel configuration
├── package.json                     # Node dependencies
├── tailwind.config.js               # Tailwind configuration
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # This file
```

---

## 📡 API Reference

### Chat Endpoint

```http
POST /api/chat
Content-Type: application/json

{
  "message": "string",
  "thread_id": "string",
  "session_id": "string (optional)",
  "language": "en (default)",
  "user_id": "string (optional)",
  "tool": "auto | chat | report | presentation | diagram | image"
}
```

**Response:** Server-Sent Events (SSE) stream

```
data: {"status": "routing", "tool": "presentation"}
data: {"status": "generating"}
data: {"token": "Here"}
data: {"token": " is"}
data: {"token": " your"}
...
data: {"done": true, "tool_used": "presentation", "slideData": [...]}
```

### Image Generation Endpoint

```http
POST /api/generate-image
Content-Type: application/json

{
  "prompt": "string",
  "negative_prompt": "string (optional)",
  "width": 1024,
  "height": 1024,
  "steps": 28,
  "guidance_scale": 4.5
}
```

**Response:**
```json
{
  "image_base64": "...",
  "mime_type": "image/jpeg",
  "prompt": "...",
  "model": "stabilityai/stable-diffusion-3.5-large"
}
```

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "agentic-ai-tutor",
  "llm_provider": "huggingface",
  "llm_model": "gemma-3-27b-it",
  "image_model": "stabilityai/stable-diffusion-3.5-large",
  "huggingface_configured": true
}
```

---

## 🚢 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables (Vercel Dashboard)

Add these in Vercel project settings:

| Variable | Value |
|----------|-------|
| `HUGGINGFACE_API_KEY` | Your HF token |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key |

### Vercel Configuration

The `vercel.json` is already configured:
- Python runtime for API routes
- 60-second function timeout
- Streaming response support

---

## 📊 Service Limits (All Free Tier)

| Service | Limit | Notes |
|---------|-------|-------|
| **Hugging Face** | Unlimited* | Free inference API |
| **Vercel Hobby** | 100GB bandwidth | 60s function timeout |
| **Supabase Free** | 500MB database | 2GB storage |
| **Edge-TTS** | Unlimited | No API key needed |
| **Google APIs** | Generous limits | OAuth required |

*Subject to fair use policy

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **CSRBOX & IBM SkillsBuild** - Capstone project opportunity
- **United Nations SDG 4** - Quality Education mission
- **Hugging Face** - Free inference API
- **Stability AI** - Stable Diffusion 3.5
- **Google** - Gemma model & APIs
- **Open Source Community** - All contributors

---

## 📞 Contact & Links

- **Live Demo**: [ai-tutor-vert-tau.vercel.app](https://ai-tutor-vert-tau.vercel.app)
- **GitHub**: [github.com/Shib-Sankar-Das/AI-Tutor](https://github.com/Shib-Sankar-Das/AI-Tutor)
- **Developer**: Shib Sankar Das

---

<div align="center">

**Built with ❤️ for Quality Education**

**🎓 UN Sustainable Development Goal 4 🎓**

*"Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all"*

</div>
