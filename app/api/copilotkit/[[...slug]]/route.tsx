import {
  CopilotRuntime,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { A2AAgent } from "@ag-ui/a2a";
import { A2AClient } from "@a2a-js/sdk/client";
import { handle } from "hono/vercel";

const a2aAgentUrl = process.env.A2A_AGENT_URL ?? "http://localhost:10002";
const a2aClient = new A2AClient(a2aAgentUrl);
const agent = new A2AAgent({ a2aClient });

const runtime = new CopilotRuntime({
  agents: {
    default: agent,
  },
  runner: new InMemoryAgentRunner(),
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);
