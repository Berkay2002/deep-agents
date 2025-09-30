# Model Context Protocol (MCP)

> **📚 For Deep Agents Project:** This document covers LangChain MCP integration patterns. For Node.js-specific MCP server implementations, installation, and configuration in this project, see **[MCP-SERVERS.md](MCP-SERVERS.md)**.

<Warning>
  **Alpha Notice:** These docs cover the [**v1-alpha**](../releases/langchain-v1) release. Content is incomplete and subject to change.

  For the latest stable version, see the v0 [LangChain Python](https://python.langchain.com/docs/introduction/) or [LangChain JavaScript](https://js.langchain.com/docs/introduction/) docs.
</Warning>

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) is an open protocol that standardizes how applications provide tools and context to LLMs. LangChain agents can use tools defined on MCP servers using the [`langchain-mcp-adapters`](https://github.com/langchain-ai/langchain-mcp-adapters) library.

## Deep Agents Project Context

**This project uses Node.js/TypeScript exclusively.** The examples below include Python implementations for reference, but for practical implementation in this project:

- ✅ **Use Node.js MCP servers** (see [MCP-SERVERS.md](MCP-SERVERS.md))
- ✅ **Follow TypeScript patterns** with `@modelcontextprotocol/sdk`
- ✅ **Configure via `apps/agent/src/utils/tools.ts`**
- ❌ **No Python dependencies** in this project

For specific guidance on available Node.js servers, installation, local vs. SSE transport, custom server creation, and troubleshooting, refer to **[MCP-SERVERS.md](MCP-SERVERS.md)**.

<img src="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/mcp.png?fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=0b359e64aacc985b786ffd2127cf066a" alt="MCP" data-og-width="1530" width="1530" data-og-height="597" height="597" data-path="oss/images/mcp.png" data-optimize="true" data-opv="2" srcset="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/mcp.png?w=280&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=d17b39ff87eef5cdcaae0ce2c47068df 280w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/mcp.png?w=560&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=282771f75ac23422456e19e106dfe359 560w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/mcp.png?w=840&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=5863265174611d0a11a3a7368b0c40c6 840w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/mcp.png?w=1100&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=009a03fa3fd742def28ff8ce93d79bf6 1100w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/mcp.png?w=1650&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=b99da953e37bac1dfcce1a7e5e50babe 1650w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/mcp.png?w=2500&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=c53008d7bd328cb9883afd5766a16905 2500w" />

## Install

Install the `langchain-mcp-adapters` library to use MCP tools in LangGraph:

<CodeGroup>
  ```bash pip
  pip install langchain-mcp-adapters
  ```

  ```bash uv
  uv add langchain-mcp-adapters
  ```
</CodeGroup>

## Transport types

MCP supports different transport mechanisms for client-server communication:

* stdio: Client launches server as a subprocess and communicates via standard input/output. Best for local tools and simple setups.
* Streamable HTTP: Server runs as an independent process handling HTTP requests. Supports remote connections and multiple clients.
* Server-Sent Events (SSE): a variant of streamable HTTP optimized for real-time streaming communication.

## Use MCP tools

`langchain-mcp-adapters` enables agents to use tools defined across one or more MCP server.

```python Accessing multiple MCP servers {highlight={1,4,19,22}} icon="server"
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_agent

client = MultiServerMCPClient(
    {
        "math": {
            "transport": "stdio",  # Local subprocess communication
            "command": "python",
            # Absolute path to your math_server.py file
            "args": ["/path/to/math_server.py"],
        },
        "weather": {
            "transport": "streamable_http",  # HTTP-based remote server
            # Ensure you start your weather server on port 8000
            "url": "http://localhost:8000/mcp",
        }
    }
)

tools = await client.get_tools()
agent = create_agent(
    "anthropic:claude-3-7-sonnet-latest",
    tools
)
math_response = await agent.ainvoke(
    {"messages": [{"role": "user", "content": "what's (3 + 5) x 12?"}]}
)
weather_response = await agent.ainvoke(
    {"messages": [{"role": "user", "content": "what is the weather in nyc?"}]}
)
```

<Note>
  `MultiServerMCPClient` is **stateless by default**. Each tool invocation creates a fresh MCP `ClientSession`, executes the tool, and then cleans up.
</Note>

## Custom MCP servers

To create your own MCP servers, you can use the `mcp` library. This library provides a simple way to define [tools](https://modelcontextprotocol.io/docs/learn/server-concepts#tools-ai-actions) and run them as servers.

<CodeGroup>
  ```bash pip
  pip install mcp
  ```

  ```bash uv
  uv add mcp
  ```
</CodeGroup>

Use the following reference implementations to test your agent with MCP tool servers.

```python title="Math server (stdio transport)" icon="floppy-disk"
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Math")

@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@mcp.tool()
def multiply(a: int, b: int) -> int:
    """Multiply two numbers"""
    return a * b

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

```python title="Weather server (streamable HTTP transport)" icon="wifi"
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Weather")

@mcp.tool()
async def get_weather(location: str) -> str:
    """Get weather for location."""
    return "It's always sunny in New York"

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
```

## Expose LangChain tools via MCP

You can also expose existing LangChain tools through an MCP server using the `to_fastmcp` function. This allows you to make your LangChain tools available to any MCP client.

```python Make LangChain tools available via MCP icon="tool"
from langchain_core.tools import tool
from langchain_mcp_adapters.tools import to_fastmcp
from mcp.server.fastmcp import FastMCP


@tool
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@tool
def get_user_info(user_id: str) -> str:
    """Get information about a user"""
    return f"User {user_id} is active"


# Convert LangChain tools to FastMCP
fastmcp_tools = [to_fastmcp(tool) for tool in (add, get_user_info)]

# Create server using converted tools
mcp = FastMCP("LangChain Tools", tools=fastmcp_tools)
mcp.run(transport="stdio")
```

## Stateful tool usage

For stateful servers that maintain context between tool calls, use `client.session()` to create a persistent `ClientSession`.

```python Using MCP ClientSession for stateful tool usage
from langchain_mcp_adapters.tools import load_mcp_tools

client = MultiServerMCPClient({...})
async with client.session("math") as session:
    tools = await load_mcp_tools(session)
```

## Additional resources

* [MCP documentation](https://modelcontextprotocol.io/introduction)
* [MCP Transport documentation](https://modelcontextprotocol.io/docs/concepts/transports)
* [`langchain-mcp-adapters`](https://github.com/langchain-ai/langchain-mcp-adapters)

# LangChain MCP Adapter: 

# LangChain MCP Adapters

This library provides a lightweight wrapper that makes [Anthropic Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) tools compatible with [LangChain](https://github.com/langchain-ai/langchain) and [LangGraph](https://github.com/langchain-ai/langgraph).

![MCP](static/img/mcp.png)

> [!note]
> A JavaScript/TypeScript version of this library is also available at [langchainjs](https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-mcp-adapters/).

## Features

- 🛠️ Convert MCP tools into [LangChain tools](https://python.langchain.com/docs/concepts/tools/) that can be used with [LangGraph](https://github.com/langchain-ai/langgraph) agents
- 📦 A client implementation that allows you to connect to multiple MCP servers and load tools from them

## Installation

```bash
pip install langchain-mcp-adapters
```

## Quickstart

Here is a simple example of using the MCP tools with a LangGraph agent.

```bash
pip install langchain-mcp-adapters langgraph "langchain[openai]"

export OPENAI_API_KEY=<your_api_key>
```

### Server

First, let's create an MCP server that can add and multiply numbers.

```python
# math_server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Math")

@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@mcp.tool()
def multiply(a: int, b: int) -> int:
    """Multiply two numbers"""
    return a * b

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

### Client

```python
# Create server parameters for stdio connection
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.prebuilt import create_react_agent

server_params = StdioServerParameters(
    command="python",
    # Make sure to update to the full absolute path to your math_server.py file
    args=["/path/to/math_server.py"],
)

async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        # Initialize the connection
        await session.initialize()

        # Get tools
        tools = await load_mcp_tools(session)

        # Create and run the agent
        agent = create_react_agent("openai:gpt-4.1", tools)
        agent_response = await agent.ainvoke({"messages": "what's (3 + 5) x 12?"})
```

## Multiple MCP Servers

The library also allows you to connect to multiple MCP servers and load tools from them:

### Server

```python
# math_server.py
...

# weather_server.py
from typing import List
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Weather")

@mcp.tool()
async def get_weather(location: str) -> str:
    """Get weather for location."""
    return "It's always sunny in New York"

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
```

```bash
python weather_server.py
```

### Client

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent

client = MultiServerMCPClient(
    {
        "math": {
            "command": "python",
            # Make sure to update to the full absolute path to your math_server.py file
            "args": ["/path/to/math_server.py"],
            "transport": "stdio",
        },
        "weather": {
            # Make sure you start your weather server on port 8000
            "url": "http://localhost:8000/mcp/",
            "transport": "streamable_http",
        }
    }
)
tools = await client.get_tools()
agent = create_react_agent("openai:gpt-4.1", tools)
math_response = await agent.ainvoke({"messages": "what's (3 + 5) x 12?"})
weather_response = await agent.ainvoke({"messages": "what is the weather in nyc?"})
```

> [!note]
> Example above will start a new MCP `ClientSession` for each tool invocation. If you would like to explicitly start a session for a given server, you can do:
>
> ```python
> from langchain_mcp_adapters.tools import load_mcp_tools
>
> client = MultiServerMCPClient({...})
> async with client.session("math") as session:
>     tools = await load_mcp_tools(session)
> ```

## Streamable HTTP

MCP now supports [streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) transport.

To start an [example](examples/servers/streamable-http-stateless/) streamable HTTP server, run the following:

```bash
cd examples/servers/streamable-http-stateless/
uv run mcp-simple-streamablehttp-stateless --port 3000
```

Alternatively, you can use FastMCP directly (as in the examples above).

To use it with Python MCP SDK `streamablehttp_client`:

```python
# Use server from examples/servers/streamable-http-stateless/

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

from langgraph.prebuilt import create_react_agent
from langchain_mcp_adapters.tools import load_mcp_tools

async with streamablehttp_client("http://localhost:3000/mcp/") as (read, write, _):
    async with ClientSession(read, write) as session:
        # Initialize the connection
        await session.initialize()

        # Get tools
        tools = await load_mcp_tools(session)
        agent = create_react_agent("openai:gpt-4.1", tools)
        math_response = await agent.ainvoke({"messages": "what's (3 + 5) x 12?"})
```

Use it with `MultiServerMCPClient`:

```python
# Use server from examples/servers/streamable-http-stateless/
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent

client = MultiServerMCPClient(
    {
        "math": {
            "transport": "streamable_http",
            "url": "http://localhost:3000/mcp/"
        },
    }
)
tools = await client.get_tools()
agent = create_react_agent("openai:gpt-4.1", tools)
math_response = await agent.ainvoke({"messages": "what's (3 + 5) x 12?"})
```

## Passing runtime headers

When connecting to MCP servers, you can include custom headers (e.g., for authentication or tracing) using the `headers` field in the connection configuration. This is supported for the following transports:

- `sse`
- `streamable_http`

### Example: passing headers with `MultiServerMCPClient`

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent

client = MultiServerMCPClient(
    {
        "weather": {
            "transport": "streamable_http",
            "url": "http://localhost:8000/mcp",
            "headers": {
                "Authorization": "Bearer YOUR_TOKEN",
                "X-Custom-Header": "custom-value"
            },
        }
    }
)
tools = await client.get_tools()
agent = create_react_agent("openai:gpt-4.1", tools)
response = await agent.ainvoke({"messages": "what is the weather in nyc?"})
```

> Only `sse` and `streamable_http` transports support runtime headers. These headers are passed with every HTTP request to the MCP server.

## Using with LangGraph StateGraph

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.graph import StateGraph, MessagesState, START
from langgraph.prebuilt import ToolNode, tools_condition

from langchain.chat_models import init_chat_model
model = init_chat_model("openai:gpt-4.1")

client = MultiServerMCPClient(
    {
        "math": {
            "command": "python",
            # Make sure to update to the full absolute path to your math_server.py file
            "args": ["./examples/math_server.py"],
            "transport": "stdio",
        },
        "weather": {
            # make sure you start your weather server on port 8000
            "url": "http://localhost:8000/mcp/",
            "transport": "streamable_http",
        }
    }
)
tools = await client.get_tools()

def call_model(state: MessagesState):
    response = model.bind_tools(tools).invoke(state["messages"])
    return {"messages": response}

builder = StateGraph(MessagesState)
builder.add_node(call_model)
builder.add_node(ToolNode(tools))
builder.add_edge(START, "call_model")
builder.add_conditional_edges(
    "call_model",
    tools_condition,
)
builder.add_edge("tools", "call_model")
graph = builder.compile()
math_response = await graph.ainvoke({"messages": "what's (3 + 5) x 12?"})
weather_response = await graph.ainvoke({"messages": "what is the weather in nyc?"})
```

## Using with LangGraph API Server

> [!TIP]
> Check out [this guide](https://langchain-ai.github.io/langgraph/tutorials/langgraph-platform/local-server/) on getting started with LangGraph API server.

If you want to run a LangGraph agent that uses MCP tools in a LangGraph API server, you can use the following setup:

```python
# graph.py
from contextlib import asynccontextmanager
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent

async def make_graph():
    client = MultiServerMCPClient(
        {
            "math": {
                "command": "python",
                # Make sure to update to the full absolute path to your math_server.py file
                "args": ["/path/to/math_server.py"],
                "transport": "stdio",
            },
            "weather": {
                # make sure you start your weather server on port 8000
                "url": "http://localhost:8000/mcp/",
                "transport": "streamable_http",
            }
        }
    )
    tools = await client.get_tools()
    agent = create_react_agent("openai:gpt-4.1", tools)
    return agent
```

In your [`langgraph.json`](https://langchain-ai.github.io/langgraph/cloud/reference/cli/#configuration-file) make sure to specify `make_graph` as your graph entrypoint:

```json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./graph.py:make_graph"
  }
}
```

## Add LangChain tools to a FastMCP server

Use `to_fastmcp` to convert LangChain tools to FastMCP, and then add them to the `FastMCP` server via the initializer:

> [!NOTE]
> `tools` argument is only available in FastMCP as of `mcp >= 1.9.1`

```python
from langchain_core.tools import tool
from langchain_mcp_adapters.tools import to_fastmcp
from mcp.server.fastmcp import FastMCP


@tool
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b


fastmcp_tool = to_fastmcp(add)

mcp = FastMCP("Math", tools=[fastmcp_tool])
mcp.run(transport="stdio")
```

---

## Deep Agents Project - Node.js Implementation

**For Node.js/TypeScript implementations in this project**, see:

- **[MCP-SERVERS.md](MCP-SERVERS.md)** - Comprehensive guide for Node.js MCP servers:
  - Available Node.js/TypeScript servers (Fetch, Filesystem, Git, Memory, Time, etc.)
  - Local installation vs. SSE transport options
  - Custom server creation with `@modelcontextprotocol/sdk`
  - Configuration in `apps/agent/src/utils/tools.ts`
  - Troubleshooting common issues

**Key Differences from Python Examples Above:**
- ✅ Use Node.js packages (`mcp-node-fetch`, `filesystem-mcp-server`, etc.)
- ✅ Use `node` command for local packages instead of `python`
- ✅ Follow TypeScript patterns with `@modelcontextprotocol/sdk`
- ❌ No Python/uvx/pip required