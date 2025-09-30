# Deep Agents Monorepo

A production-ready LangGraph agent system with Google Gemini 2.5 Pro and a modern chat interface powered by Clerk authentication.

## Structure

- `apps/agent`: LangGraph agent using the `deepagents` library with Google Gemini 2.5 Pro
- `apps/agent-chat-ui`: Next.js 15 chat UI with Clerk authentication and JWT-based LangGraph proxy

## Features

- **LangGraph Agent**: Deep reasoning agent with Google Gemini 2.5 Pro
- **Modern Chat UI**: Full-featured chat interface with message streaming
- **Clerk Authentication**: Secure user authentication and session management
- **JWT Authorization**: HS256 JWT tokens for agent authorization
- **TypeScript**: Strict type safety across the entire monorepo
- **Model Context Protocol**: MCP support for extensible tool integration (currently disabled)

## Quick Start

### Prerequisites

- Node.js 20+
- Google AI API key ([get one here](https://aistudio.google.com/apikey))
- Clerk account ([sign up here](https://clerk.com/))

### Installation

```bash
npm install
```

### Configuration

1. **Configure the agent** (`apps/agent/.env`):
```bash
GOOGLE_API_KEY=your_google_api_key_here
LANGGRAPH_AUTH_SECRET=your_shared_secret_here
LANGGRAPH_AUTH_ISSUER=http://localhost:3000
LANGGRAPH_AUTH_AUDIENCE=deep-agents-langgraph
```

2. **Configure the chat UI** (`apps/agent-chat-ui/.env.local`):
```bash
LANGGRAPH_API_URL=http://localhost:2024
LANGGRAPH_AUTH_SECRET=your_shared_secret_here  # Must match agent secret
LANGGRAPH_AUTH_ISSUER=http://localhost:3000
LANGGRAPH_AUTH_AUDIENCE=deep-agents-langgraph

# Get these from https://dashboard.clerk.com/last-active?path=api-keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

### Running the Application

```bash
# Terminal 1: Start the LangGraph agent
cd apps/agent
npm run build  # Required: compile TypeScript
npm run dev    # Starts on port 2024

# Terminal 2: Start the chat UI
cd apps/agent-chat-ui
npm run dev    # Starts on port 3000
```

Visit http://localhost:3000 and sign in to start chatting with your agent!

## Development

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation and development guidelines.