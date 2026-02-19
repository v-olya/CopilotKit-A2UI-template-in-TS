import {
  CopilotRuntime,
  EmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { BuiltInAgent } from "@copilotkitnext/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { NextRequest } from "next/server";

const ollamaModel = process.env.OLLAMA_MODEL || "gpt-oss:20b-cloud";
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

const ollamaProvider = createOpenAI({
  apiKey: "ollama",
  baseURL: `${ollamaBaseUrl}/v1`,
});

const agent = new BuiltInAgent({
  model: ollamaProvider(ollamaModel),
  prompt: `
You are a restaurant search assistant. Call the searchRestaurants tool when the user specifies a cuisine or location.

Rules:
- Call the tool with only the parameters the user specifies. Don't add missing ones.
- Never mention restaurants that aren't in the tool output. 
- After calling the tool, respond with exactly: "Found [N] restaurants." where N is the actual number returned.
- Don't describe or name the restaurants. The UI displays them.
- If no results, suggest different search criteria.

IMPORTANT: If the user doesn't specify neither cuisine, nor location, DO NOT call a tool, just ask the user for one of them.
  `,
});

const runtime = new CopilotRuntime({
  agents: { default: agent },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new EmptyAdapter(),
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};

export const GET = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new EmptyAdapter(),
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
