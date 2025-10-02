/**
 * Example of using the stable middleware implementation with createDeepAgent
 */

import { allMiddlewareMessageModifier, createDeepAgent } from "../index.js";

// Create a Deep Agent with middleware functionality
const agent = createDeepAgent({
  instructions: `You are a helpful assistant that can manage files and todos.${allMiddlewareMessageModifier("")}`,
  // The middleware tools are automatically included in the agent
});

// Example usage
export async function example() {
  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "Create a todo list for building a simple web app",
      },
    ],
  });

  return result;
}

// Uncomment to run the example
// example();
