# Multi-Agent Architecture Migration Guide

This document explains the new multi-agent architecture and how to migrate from the previous single-agent setup.

## What Changed

### Old Structure
```
src/
├── agent.ts          # Single agent implementation
├── utils/
│   ├── nodes.ts      # Subagents configuration
│   ├── tools.ts      # Tools configuration
│   └── ...
```

### New Structure
```
src/
├── agents/
│   ├── deep-research/    # Deep research agent
│   │   ├── agent.ts
│   │   ├── nodes.ts
│   │   ├── tools.ts
│   │   └── prompts.ts
│   ├── code-assistant/   # Code assistant agent
│   │   ├── agent.ts
│   │   ├── nodes.ts
│   │   ├── tools.ts
│   │   └── prompts.ts
│   └── index.ts         # Agent registry
├── shared/
│   ├── types.ts         # Shared types
│   └── model.ts         # Shared model config
├── router.ts            # Agent selection logic
└── main.ts              # Main entry point
```

## Backward Compatibility

The new architecture maintains **full backward compatibility**:

- `deepAgentGraph` export still works
- `invokeDeepAgent()` function still works
- All existing API endpoints continue to function
- The `agent` graph in langgraph.json still points to the same functionality

## New Features

### 1. Multiple Agent Types

You can now create different types of agents:

```typescript
import { createAgent } from './agents/index.js';

// Create specific agent types
const researchAgent = await createAgent('deep-research');
const codeAgent = await createAgent('code-assistant');
```

### 2. Automatic Agent Selection

The router can automatically select the best agent based on message content:

```typescript
import { invokeWithAgentSelection } from './main.js';

// Automatically selects the best agent
const response = await invokeWithAgentSelection({
  messages: [{ role: 'user', content: 'Help me debug this TypeScript code' }]
});
```

### 3. Explicit Agent Selection

You can explicitly specify which agent to use:

```typescript
import { invokeSpecificAgent } from './main.js';

// Use specific agent
const response = await invokeSpecificAgent('code-assistant', {
  messages: [{ role: 'user', content: 'Review my code' }]
});
```

### 4. LangGraph Multi-Graph Support

The `langgraph.json` now supports multiple graphs:

```json
{
  "graphs": {
    "agent": "./dist/main.js:deepAgentGraph",        // Backward compatibility
    "deep-research": "./dist/main.js:deepResearchAgent",
    "code-assistant": "./dist/main.js:codeAssistantAgent",
    "router": "./dist/main.js:routerAgent"           // Auto-selection
  }
}
```

## Migration Steps

### For Development

1. **No immediate action required** - everything continues to work
2. **Optional**: Start using new agent-specific endpoints
3. **Optional**: Implement new agent types as needed

### For Production

1. **Test the new branch** with existing workflows
2. **Gradually migrate** to use specific agent types
3. **Monitor performance** of the new routing system

## Adding New Agents

### 1. Create Agent Directory

```bash
mkdir src/agents/my-new-agent
```

### 2. Implement Agent Files

```typescript
// src/agents/my-new-agent/agent.ts
import { createDeepAgent } from "deepagents";
import type { AgentFactory, AgentConfig } from "../../shared/types.js";

const config: AgentConfig = {
  name: "my-new-agent",
  description: "Description of what this agent does",
  capabilities: ["capability1", "capability2"],
  temperature: 0.1
};

export const myNewAgentFactory: AgentFactory = {
  async create(config = {}) {
    // Implementation
  },
  getConfig() {
    return config;
  }
};
```

### 3. Register Agent

```typescript
// src/agents/index.ts
import { myNewAgentFactory } from "./my-new-agent/agent.js";

export const agentRegistry = {
  "deep-research": deepResearchAgentFactory,
  "code-assistant": codeAssistantAgentFactory,
  "my-new-agent": myNewAgentFactory, // Add here
};
```

### 4. Update Router (Optional)

Add keywords to automatically route to your new agent:

```typescript
// src/router.ts
function analyzeContent(content: string) {
  // Add detection logic for your agent
}
```

## Testing

### Test Backward Compatibility

```bash
npm run build
npm run dev

# Test existing endpoints still work
curl -X POST http://localhost:8000/invoke \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

### Test New Features

```bash
# Test specific agent selection
curl -X POST http://localhost:8000/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Fix my TypeScript code"}],
    "preferredAgent": "code-assistant"
  }'
```

## Monitoring

The new system includes logging for agent selection:

```
🤖 Selected agent: code-assistant
📊 Confidence: 85.2%
💭 Reasoning: Strong match for code-assistant based on keywords and context
```

Monitor these logs to understand routing behavior and adjust as needed.
