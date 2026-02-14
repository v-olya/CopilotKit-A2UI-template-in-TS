import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", "..", ".env") });

import express from "express";
import cors from "cors";
import {
  A2AExpressApp,
  DefaultRequestHandler,
  InMemoryTaskStore,
} from "@a2a-js/sdk/server";
import type { AgentCard, AgentExtension } from "@a2a-js/sdk";
import { RestaurantAgentExecutor } from "./executor.js";

const PORT = Number(process.env.AGENT_PORT ?? 10002);
const BASE_URL = `http://localhost:${PORT}`;

const A2UI_EXTENSION_URI = "https://a2ui.org/a2a-extension/a2ui/v0.8";

const agentCard: AgentCard = {
  name: "Restaurant Agent",
  description:
    "Finds restaurants and helps book tables. Uses A2UI for rich UI.",
  url: `${BASE_URL}/`,
  version: "1.0.0",
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true,
    extensions: [
      {
        uri: A2UI_EXTENSION_URI,
        description: "Provides agent driven UI using the A2UI JSON format.",
      } as AgentExtension,
    ],
  },
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["text/plain"],
  skills: [
    {
      id: "find_restaurants",
      name: "Find Restaurants",
      description: "Find restaurants by cuisine, location, and more.",
      tags: ["restaurant", "finder"],
      examples: [
        "Find me the top 10 Chinese restaurants in the US",
        "Italian restaurants in New York",
      ],
      inputModes: ["text/plain"],
      outputModes: ["text/plain"],
    },
  ],
};

const taskStore = new InMemoryTaskStore();
const executor = new RestaurantAgentExecutor();
const requestHandler = new DefaultRequestHandler(
  agentCard,
  taskStore,
  executor,
);
const appBuilder = new A2AExpressApp(requestHandler);
const app = express();
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  }),
);
appBuilder.setupRoutes(app, "");

app.listen(PORT, () => {
  console.log(`[Restaurant Agent] A2A server at ${BASE_URL}`);
  console.log(
    `[Restaurant Agent] Agent card: ${BASE_URL}.well-known/agent.json`,
  );
});
