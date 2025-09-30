# Deep Agents Monorepo

A production-ready LangGraph agent system that runs on Google Gemini 2.5 Pro and ships with a modern chat experience. The
LangChain team built the entire web workspace, while this project adds the agent workspace plus the API proxy route and auth
system that connect the UI to LangGraph.

## Table of Contents

- [Workspaces](#workspaces)
  - [Agent Workspace (`apps/agent`)](#agent-workspace-appsagent)
  - [Web Workspace (`apps/agent-chat-ui`)](#web-workspace-appsagent-chat-ui)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Stacks](#running-the-stacks)
- [Development Scripts](#development-scripts)
- [Acknowledgements](#acknowledgements)

## Workspaces

### Agent Workspace (`apps/agent`)

This workspace contains the LangGraph runtime authored for this repository. It wires together Gemini 2.5 Pro, shared tool
helpers, and execution policies so you can run deep-reasoning agents locally or in production. Key entry points include:

- `src/agent.ts` – bootstraps the LangGraph agent and tool graph.
- `src/utils` – reusable helpers for tool registration, context, and runtime ergonomics.
- `langgraph.json` – graph definition used by `langgraph dev` and `langgraph build`.

### Web Workspace (`apps/agent-chat-ui`)

The LangChain team created this Next.js 15 application, which provides a polished chat UI, Clerk integration, theming, and
component styling. My contributions here are limited to:

- `src/app/api/[..._path]/route.ts` – a streaming proxy that authenticates requests before forwarding them to LangGraph.
- The JWT-based authorization layer and related environment wiring that powers the proxy route.

All other UI components, layouts, and styling are courtesy of the LangChain authors.

## Features

- **Custom LangGraph Agent** – Gemini 2.5 Pro powered agent designed for deep reasoning tasks.
- **Streamed Chat Interface** – Real-time UX with optimistic rendering and history management.
- **Clerk Authentication** – Secure sign-in, session management, and identity resolution.
- **JWT Authorization** – Issued per-request tokens (HS256) that gate access to the LangGraph backend.
- **Model Context Protocol Ready** – MCP hooks are scaffolded for future tool integrations (currently disabled by default).
- **TypeScript End-to-End** – Shared types and strict checks across both workspaces.

## Getting Started

### Prerequisites

- Node.js 20+
- Google AI Studio API key ([request one](https://aistudio.google.com/apikey))
- Clerk account ([sign up](https://clerk.com/))

### Installation

```bash
npm install
```

### Configuration

1. **Agent environment (`apps/agent/.env`)**

   ```bash
   GOOGLE_API_KEY=your_google_api_key_here
   LANGGRAPH_AUTH_SECRET=your_shared_secret_here
   LANGGRAPH_AUTH_ISSUER=http://localhost:3000
   LANGGRAPH_AUTH_AUDIENCE=deep-agents-langgraph
   ```

2. **Web environment (`apps/agent-chat-ui/.env.local`)**

   ```bash
   LANGGRAPH_API_URL=http://localhost:2024
   LANGGRAPH_AUTH_SECRET=your_shared_secret_here  # Must match agent secret
   LANGGRAPH_AUTH_ISSUER=http://localhost:3000
   LANGGRAPH_AUTH_AUDIENCE=deep-agents-langgraph

   # Clerk (https://dashboard.clerk.com/last-active?path=api-keys)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   ```

### Running the Stacks

```bash
# Terminal 1: LangGraph agent
cd apps/agent
npm run build   # Compile TypeScript once
npm run dev     # Starts on http://localhost:2024

# Terminal 2: Next.js chat UI
cd apps/agent-chat-ui
npm run dev     # Starts on http://localhost:3000
```

Sign in at http://localhost:3000 to begin chatting with the agent.

## Development Scripts

Common scripts are available from the repository root:

- `npm run dev --workspaces` – Start both workspaces in watch mode.
- `npm run dev --workspace apps/agent` – Launch only the LangGraph agent.
- `npm run dev --workspace apps/agent-chat-ui` – Launch only the chat UI.
- `npm run build --workspace <workspace>` – Produce production bundles.
- `npm run typecheck --workspace apps/agent` – Type-check the agent workspace.
- `npm run lint` / `npm run format` – Lint and format the entire repo.

## Acknowledgements

Huge thanks to the LangChain team for open-sourcing the entire Next.js chat experience. This repository layers a custom
LangGraph agent on top and adds the secure proxy route so the UI can talk to it, but all remaining frontend work is their
craftsmanship.
