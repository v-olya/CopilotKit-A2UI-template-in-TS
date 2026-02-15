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
  prompt:
    "You are a helpful restaurant assistant. Help users find restaurants, make reservations, and answer food-related questions.",
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
