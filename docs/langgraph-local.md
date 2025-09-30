# Run a LangGraph application locally

This quickstart shows you how to set up a LangGraph application locally for testing and development.

## Prerequisites

Before you begin, ensure you have an API key for [LangSmith](https://smith.langchain.com/settings) (free to sign up).

## 1. Install the LangGraph CLI

<Tabs>
  <Tab title="Node server">
    ```shell
    npx @langchain/langgraph-cli
    ```
  </Tab>
</Tabs>

## 2. Create a LangGraph app 🌱

Create a new app from the [`new-langgraph-project-python` template](https://github.com/langchain-ai/new-langgraph-project) or [`new-langgraph-project-js` template](https://github.com/langchain-ai/new-langgraphjs-project). This template demonstrates a single-node application you can extend with your own logic.

<Tabs>
  <Tab title="Node server">
    ```shell
    langgraph new path/to/your/app --template new-langgraph-project-js
    ```
  </Tab>
</Tabs>

<Tip>
  **Additional templates**
  If you use `langgraph new` without specifying a template, you will be presented with an interactive menu that will allow you to choose from a list of available templates.
</Tip>

## 3. Install dependencies

In the root of your new LangGraph app, install the dependencies in `edit` mode so your local changes are used by the server:

<Tabs>
  <Tab title="Node server">
    ```shell
    cd path/to/your/app
    yarn install
    ```
  </Tab>
</Tabs>

## 4. Create a `.env` file

You will find a `.env.example` in the root of your new LangGraph app. Create a `.env` file in the root of your new LangGraph app and copy the contents of the `.env.example` file into it, filling in the necessary API keys:

```bash
LANGSMITH_API_KEY=lsv2...
```

## 5. Launch LangGraph Server 🚀

Start the LangGraph API server locally:

<Tabs>
  <Tab title="Node server">
    ```shell
    npx @langchain/langgraph-cli dev
    ```
  </Tab>
</Tabs>

Sample output:

```
>    Ready!
>
>    - API: [http://localhost:2024](http://localhost:2024/)
>
>    - Docs: http://localhost:2024/docs
>
>    - LangGraph Studio Web UI: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
```

The `langgraph dev` command starts LangGraph Server in an in-memory mode. This mode is suitable for development and testing purposes.

<Tip>
  For production use, deploy LangGraph Server with access to a persistent storage backend. For more information, refer to the [Deployment options](/langgraph-platform/deployment-options).
</Tip>

## 6. Test the API

<Tabs>

  <Tab title="Javascript SDK">
    1. Install the LangGraph JS SDK:

    ```shell
    npm install @langchain/langgraph-sdk
    ```

    2. Send a message to the assistant (threadless run):

    ```js
    const { Client } = await import("@langchain/langgraph-sdk");

    // only set the apiUrl if you changed the default port when calling langgraph dev
    const client = new Client({ apiUrl: "http://localhost:2024"});

    const streamResponse = client.runs.stream(
        null, // Threadless run
        "agent", // Assistant ID
        {
            input: {
                "messages": [
                    { "role": "user", "content": "What is LangGraph?"}
                ]
            },
            streamMode: "messages-tuple",
        }
    );

    for await (const chunk of streamResponse) {
        console.log(`Receiving new event of type: ${chunk.event}...`);
        console.log(JSON.stringify(chunk.data));
        console.log("\n\n");
    }
    ```
  </Tab>

  <Tab title="Rest API">
    ```bash
    curl -s --request POST \
        --url "http://localhost:2024/runs/stream" \
        --header 'Content-Type: application/json' \
        --data "{
            \"assistant_id\": \"agent\",
            \"input\": {
                \"messages\": [
                    {
                        \"role\": \"human\",
                        \"content\": \"What is LangGraph?\"
                    }
                ]
            },
            \"stream_mode\": \"messages-tuple\"
        }"
    ```
  </Tab>
</Tabs>

## Next steps

Now that you have a LangGraph app running locally, take your journey further by exploring features and deployment:

* [LangGraph Studio](/langgraph-platform/langgraph-studio) is a specialized UI that you can connect to LangGraph API server to visualize, interact with, and debug your application locally. Try the [LangGraph Studio quickstart](/langgraph-platform/quick-start-studio).
* [LangGraph Server API Reference](https://langchain-ai.github.io/langgraph/cloud/reference/api/api_ref/): Explore the LangGraph Server API documentation.
* [JS/TS SDK Reference](/langgraph-platform/js-ts-sdk): Explore the JS/TS SDK API Reference.
