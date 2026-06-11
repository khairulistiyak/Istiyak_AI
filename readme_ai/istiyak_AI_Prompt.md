# Project Name: Istiyak AI - Ultimate Multi-Provider AI Client

**Role:** You are an expert Full-Stack Developer specializing in React, TypeScript, and modern UI/UX design. Your task is to build a highly functional, secure, and clean chat application that connects to OpenRouter, Groq, local APIs, and other OpenAI-compatible endpoints.

## 1. Tech Stack

- **Frontend Framework:** React (using Vite for scaffolding)
- **Language:** TypeScript (Strict mode enabled)
- **Styling:** Tailwind CSS (for modern, responsive, and clean UI)
- **Icons:** Lucide React
- **Markdown Parsing:** `react-markdown`, `remark-gfm`, and `react-syntax-highlighter` (for rendering code blocks and tables perfectly)
- **State Management & Storage:** React Context API + Browser Local Storage (No backend required)

## 2. Core Features & Requirements

### A. Multi-Provider & Universal API Architecture

- **Universal API Caller:** Build a flexible API caller that supports any OpenAI-compatible endpoint.
- **Provider Configuration (Settings):** Allow users to manage multiple "Providers" with:
  - `Provider Name` (e.g., OpenRouter, Groq, Together AI, Ollama)
  - `Base URL` (e.g., `https://openrouter.ai/api/v1`, `https://api.groq.com/openai/v1`)
  - `API Key` (Specific to that provider, securely saved in `localStorage`)
- **Local AI Support:** Ensure the fetch logic can handle local network endpoints (e.g., `http://localhost:11434/v1`) for offline models like Ollama.

### B. Intelligent Auto-Routing System (Task-Based Model Selection)

- **Model Vault:** Let users define models mapped to specific tasks and providers:
  - _Coding/Tech Model_ (e.g., Claude 3.5 Sonnet on OpenRouter)
  - _Creative/Branding Model_ (e.g., Gemini Pro on OpenRouter)
  - _General/Fast Chat Model_ (e.g., Llama 3 8B on Groq)
- **Auto-Detection Logic:** Analyze user input before the API call:
  - Technical keywords ('react', 'typescript', 'code', 'error', 'bug') -> Route to _Coding Model_.
  - Creative keywords ('design', 'logo', 'brand', 'content') -> Route to _Creative Model_.
  - Otherwise -> Route to _Fast Chat Model_.
- **Dynamic UI Indication:** Show a dynamic badge above the chat box: "Routing to: [Model Name] via [Provider]".
- **Manual Override:** A toggle switch ("Auto-Route: ON/OFF") to let the user manually pick a specific model/provider combo.

### C. Chat Interface & Functionality

- **System Prompt:** Allow users to set a global or per-chat custom System Prompt.
- **Real-time UI:** Display messages in a clean chat bubble format. Include an auto-resizing textarea for user prompts.
- **Streaming Support:** Handle Server-Sent Events (SSE) stream responses.

### D. Code Block & Copy Functionality

- **Syntax Highlighting:** Use `react-syntax-highlighter` with a modern dark theme for all code blocks.
- **Code Header:** Sticky header showing the programming language name.
- **Copy Button:** Include a "Copy" button (Lucide clipboard icon).
- **Clipboard API:** Use `navigator.clipboard.writeText()` strictly for the code content.
- **Visual Feedback:** Change the copy icon/text to "Copied!" (with a Check icon) for 2 seconds.

### E. Chat History (Local Database)

- Save all conversation threads locally using `localStorage`.
- Allow users to view past chats, create a "New Chat", rename chats, and delete them.

## 3. UI/UX Specifications (Productivity Focused)

- **Design Theme:** Minimalist, professional, and distraction-free. Clean dark mode default (slate/zinc palette).
- **Layout Structure:**
  - **Left Sidebar:** Chat history list and global Settings gear icon.
  - **Main Area (Top):** Active Model/Provider info or Auto-Routing status.
  - **Main Area (Middle):** Scrollable message thread (auto-scroll to bottom on new messages).
  - **Main Area (Bottom):** Input area with submit button.

## 4. Execution Plan for the Agent

1.  Initialize Vite + React + TypeScript + Tailwind.
2.  Build the State/Storage logic (`useLocalStorage` for providers, models, routing rules, chat history).
3.  Develop the `services/aiService.ts` to handle dynamic base URLs, keys, and auto-routing logic.
4.  Build components (`Sidebar`, `ChatWindow`, `InputBox`, `SettingsModal`, `MessageBubble` with markdown/copy functions).
5.  Refine UI/UX and ensure bug-free execution. Let's build it block by block.
