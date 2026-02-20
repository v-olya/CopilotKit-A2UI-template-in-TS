/**
 * OpenRouter API client (no Vercel AI SDK). Uses fetch to POST to OpenRouter.
 */
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  };
}

export type ToolRunner = (name: string, args: Record<string, unknown>) => Promise<string>;

async function callOpenRouter(params: {
  model: string;
  messages: OpenRouterMessage[];
  tools?: OpenRouterTool[];
  tool_choice?: "auto" | "required" | "none" | { type: "function"; function: { name: string } };
  temperature?: number;
}): Promise<{ content?: string | null; tool_calls?: Array<{ id: string; function?: { name?: string; arguments?: string } }> }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: 2000,
  };
  if (params.tools?.length) {
    body.tools = params.tools;
    body.tool_choice = params.tool_choice ?? "auto";
  }
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{ id: string; function?: { name?: string; arguments?: string } }>;
      };
    }>;
  };
  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new Error("OpenRouter returned no message");
  }
  return message;
}

/** Call OpenRouter with tools; runs tool_calls and re-calls until assistant returns content. */
export async function openRouterChatWithTools(params: {
  model: string;
  messages: OpenRouterMessage[];
  tools: OpenRouterTool[];
  temperature?: number;
  runTool: ToolRunner;
}): Promise<string> {
  const messages: OpenRouterMessage[] = [...params.messages];
  const maxRounds = 5;
  for (let round = 0; round < maxRounds; round++) {
    const msg = await callOpenRouter({
      model: params.model,
      messages,
      tools: params.tools,
      tool_choice: round === 0 ? { type: "function", function: { name: "get_restaurants" } } : "auto",
      temperature: params.temperature,
    });
    const content = msg.content ?? "";
    const toolCalls = msg.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return content;
    }
    for (const tc of toolCalls) {
      const name = tc.function?.name ?? "";
      let args: Record<string, unknown> = {};
      try {
        if (tc.function?.arguments) {
          args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        }
      } catch {
        // ignore parse errors
      }
      const result = await params.runTool(name, args);
      
      // If we got non-empty results, stop processing more tool calls
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed) && parsed.length > 0) {
        messages.push({ role: "assistant", content: content || "[Tool call]" });
        messages.push({
          role: "user",
          content: `Tool result (${name}): ${result}`,
        });
        break;
      }
      
      messages.push({ role: "assistant", content: content || "[Tool call]" });
      messages.push({
        role: "user",
        content: `Tool result (${name}): ${result}`,
      });
    }
  }
  const last = await callOpenRouter({
    model: params.model,
    messages,
    tools: params.tools,
    tool_choice: "none",
    temperature: params.temperature,
  });
  return last.content ?? "";
}
