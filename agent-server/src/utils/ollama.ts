/**
 * Ollama API client. Uses fetch to POST to local Ollama instance.
 */
const OLLAMA_BASE = "http://localhost:11434";

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

type OllamaToolRunner = (
  name: string,
  args: Record<string, unknown>,
) => Promise<string>;

async function callOllama(params: {
  model: string;
  messages: OllamaMessage[];
  tools?: OllamaTool[];
  temperature?: number;
}): Promise<{
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    function?: { name?: string; arguments?: unknown };
  }>;
}> {
  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    stream: false,
  };
  if (params.tools?.length) {
    body.tools = params.tools;
  }
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama API error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as {
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        function?: { name?: string; arguments?: unknown };
      }>;
    };
  };
  const message = data.message;
  if (!message) {
    throw new Error("Ollama returned no message");
  }
  return message;
}

export async function ollamaChatWithTools(params: {
  model: string;
  messages: OllamaMessage[];
  tools: OllamaTool[];
  temperature?: number;
  runTool: OllamaToolRunner;
}): Promise<string> {
  const messages: OllamaMessage[] = [...params.messages];
  const maxRounds = 3;
  for (let round = 0; round < maxRounds; round++) {
    const msg = await callOllama({
      model: params.model,
      messages,
      tools: params.tools,
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
          const rawArgs = tc.function.arguments;
          if (typeof rawArgs === "object") {
            args = rawArgs as Record<string, unknown>;
          } else if (typeof rawArgs === "string") {
            args = JSON.parse(rawArgs) as Record<string, unknown>;
          }
        }
      } catch (err) {
        console.error(
          "Failed to parse tool arguments:",
          tc.function?.arguments,
          err,
        );
      }
      const result = await params.runTool(name, args);

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
  const last = await callOllama({
    model: params.model,
    messages,
    tools: params.tools,
    temperature: params.temperature,
  });
  return last.content ?? "";
}
