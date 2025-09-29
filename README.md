# Deep Agents Monorepo

This repository scaffolds a LangGraph agent package alongside a Next.js web application that proxies API requests to the LangGraph Server.

## Structure

- `apps/agent`: LangGraph agent package containing agent source files and configuration.
- `apps/web`: Next.js application with an API route that forwards traffic to the LangGraph Server.

## Getting Started

1. Install dependencies with your preferred package manager (e.g. `pnpm install`).
2. Configure `apps/agent/.env` with the required environment variables.
3. Run the LangGraph agent and start the Next.js dev server as needed.
