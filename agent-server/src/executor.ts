import type {
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
} from "@a2a-js/sdk/server";
import type { Task, TaskStatusUpdateEvent } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

interface TaskWithForwardedProps extends Task {
  forwardedProps?: {
    a2uiAction?: {
      actionName?: string;
      name?: string;
      context?: Record<string, unknown>;
    };
    command?: Record<string, unknown>;
  };
}

import { ollamaChatWithTools } from "./utils/ollama.js";
import { getSystemPrompt, GET_RESTAURANTS_TOOL } from "./prompts.js";
import { getRestaurants } from "./restaurant-data.js";
import {
  getQueryFromAction,
  createBookingForm,
  createBookingConfirmation,
  createRestaurantListUI,
  type Restaurant,
} from "./utils/ui-helpers.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", "..", ".env") });

const MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:latest";

export class RestaurantAgentExecutor implements AgentExecutor {
  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    const { userMessage, taskId, contextId, task } = requestContext;
    const taskWithForwardedProps = task as TaskWithForwardedProps | undefined;

    if (!task) {
      const initialTask: Task = {
        kind: "task",
        id: taskId,
        contextId,
        status: { state: "submitted", timestamp: new Date().toISOString() },
        history: [userMessage],
        metadata: userMessage.metadata,
        artifacts: [],
      };
      eventBus.publish(initialTask);
    }

    const forwardedProps = taskWithForwardedProps?.forwardedProps;
    console.log(
      "[DEBUG] task exists:",
      !!task,
      ", has forwardedProps:",
      !!forwardedProps,
    );
    if (forwardedProps) {
      console.log(
        "[DEBUG] forwardedProps keys:",
        Object.keys(forwardedProps).join(", "),
      );
    }
    let query = "";
    let userAction: string | undefined;
    let actionContext: Record<string, unknown> = {};

    console.log("[DEBUG] userMessage parts count:", userMessage.parts.length);
    for (let i = 0; i < userMessage.parts.length; i++) {
      const part = userMessage.parts[i];
      console.log(`[DEBUG] Part ${i}: kind=${part?.kind}`);
      if (part?.kind === "data") {
        const dataPart = part as {
          kind: "data";
          data: Record<string, unknown>;
        };
        console.log(
          `[DEBUG] Part ${i} data keys:`,
          Object.keys(dataPart.data).join(", "),
        );
      }
    }

    if (forwardedProps) {
      const a2uiAction = forwardedProps?.a2uiAction;
      console.log("[DEBUG] a2uiAction:", !!a2uiAction);
      if (a2uiAction) {
        console.log(
          "[DEBUG] a2uiAction keys:",
          Object.keys(a2uiAction).join(", "),
        );
        const actionName = a2uiAction?.actionName || a2uiAction?.name;
        const actionCtx = a2uiAction?.context || {};
        if (actionName) {
          console.log(
            "[DEBUG] Extracted action from forwardedProps:",
            actionName,
          );
          userAction = actionName as string;
          actionContext =
            typeof actionCtx === "object"
              ? (actionCtx as Record<string, unknown>)
              : {};
        }
      }
      const command = forwardedProps?.command;
      console.log("[DEBUG] command:", !!command);
      if (command) {
        console.log("[DEBUG] command keys:", Object.keys(command).join(", "));
      }
    }

    for (const part of userMessage.parts) {
      if (part?.kind === "data") {
        const dataPart = part as {
          kind: "data";
          data: Record<string, unknown>;
        };
        console.log(
          "[DEBUG] Processing data part, keys:",
          Object.keys(dataPart.data).join(", "),
        );
        if ("userAction" in dataPart.data) {
          console.log(
            "[DEBUG] Found userAction in data part, value:",
            JSON.stringify(dataPart.data.userAction),
          );
          const ua = dataPart.data.userAction;
          if (typeof ua === "string") {
            userAction = ua;
            console.log("[DEBUG] userAction is string:", userAction);
          } else if (typeof ua === "object" && ua !== null) {
            const uaObj = ua as {
              name?: string;
              actionName?: string;
              context?: Record<string, unknown>;
            };
            userAction = uaObj?.name || uaObj?.actionName;
            actionContext = uaObj?.context ?? {};
            console.log(
              "[DEBUG] userAction from object:",
              userAction,
              "context:",
              JSON.stringify(actionContext).substring(0, 100),
            );
          }
          if (userAction) {
            query = getQueryFromAction(userAction, actionContext);
            break;
          }
        } else if ("action" in dataPart.data) {
          console.log("[DEBUG] Found action in data part!");
          const a = dataPart.data.action as {
            name?: string;
            context?: Record<string, unknown>;
          };
          userAction = a?.name;
          actionContext = a?.context ?? {};
          query = getQueryFromAction(userAction, actionContext);
          break;
        } else if ("a2uiAction" in dataPart.data) {
          console.log("[DEBUG] Found a2uiAction in data part!");
          const a = dataPart.data.a2uiAction as {
            actionName?: string;
            name?: string;
            context?: Record<string, unknown>;
          };
          userAction = a?.actionName || a?.name;
          actionContext = a?.context ?? {};
          query = getQueryFromAction(userAction, actionContext);
          break;
        }
      }
    }

    if (!userAction) {
      for (const part of userMessage.parts) {
        if (part?.kind === "text") {
          query = part.text;
          break;
        }
      }
    }

    if (userAction && !query) {
      query = getQueryFromAction(userAction, actionContext);
    }

    if (!query.trim()) {
      query = "Find me some restaurants.";
    }

    console.log(
      "[DEBUG] Final: userAction=",
      userAction,
      ", query=",
      query.substring(0, 50),
    );

    if (userAction === "book_restaurant" && actionContext.restaurantName) {
      const finalUpdate = createBookingForm(actionContext, taskId, contextId);
      eventBus.publish(finalUpdate);
      eventBus.finished();
      return;
    }

    if (userAction === "submit_booking") {
      const finalUpdate = createBookingConfirmation(
        actionContext,
        taskId,
        contextId,
      );
      eventBus.publish(finalUpdate);
      eventBus.finished();
      return;
    }

    const systemPrompt = getSystemPrompt();
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: query },
    ];

    const sendRestaurantListUpdate = (restaurants: Restaurant[]) => {
      if (restaurants.length === 0) return;
      const surfaceId = `restaurant-list-${uuidv4()}`;
      const update = createRestaurantListUI(
        surfaceId,
        restaurants,
        taskId,
        contextId,
        false,
      );
      eventBus.publish(update);
    };

    const runTool = async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<string> => {
      if (name === "get_restaurants") {
        const list = getRestaurants({
          cuisine: args.cuisine as string | undefined,
          location: args.location as string | undefined,
          count: args.count as number | undefined,
        });

        sendRestaurantListUpdate(list);

        return JSON.stringify(list);
      }
      return JSON.stringify({ error: `Unknown tool: ${name}` });
    };

    let content: string;
    try {
      content = await ollamaChatWithTools({
        model: MODEL,
        messages,
        tools: [GET_RESTAURANTS_TOOL],
        temperature: 0.7,
        runTool,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errorUpdate: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId,
        contextId,
        final: true,
        status: {
          state: "failed",
          timestamp: new Date().toISOString(),
          message: {
            kind: "message",
            messageId: uuidv4(),
            role: "agent",
            taskId,
            contextId,
            parts: [{ kind: "text", text: `Error: ${errMsg}` }],
          },
        },
      };
      eventBus.publish(errorUpdate);
      eventBus.finished();
      return;
    }

    const parts: Array<{ kind: "text"; text: string }> = [
      { kind: "text", text: content.trim() || "Done." },
    ];

    const finalUpdate: TaskStatusUpdateEvent = {
      kind: "status-update",
      taskId,
      contextId,
      final: true,
      status: {
        state: "input-required",
        timestamp: new Date().toISOString(),
        message: {
          kind: "message",
          messageId: uuidv4(),
          role: "agent",
          taskId,
          contextId,
          parts,
        },
      },
    };
    eventBus.publish(finalUpdate);
    eventBus.finished();
  }

  async cancelTask(
    _taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    eventBus.finished();
  }
}
