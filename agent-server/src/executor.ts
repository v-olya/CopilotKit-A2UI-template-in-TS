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
import { ollamaChatWithTools } from "./ollama.js";
import { getSystemPrompt, GET_RESTAURANTS_TOOL } from "./prompts.js";
import { getRestaurants } from "./restaurant-data.js";
import { createA2UIPart, parseAgentResponse } from "./a2ui.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", "..", ".env") });

const MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:latest";

function getQueryFromAction(
  userAction: string | undefined,
  actionContext: Record<string, unknown>,
): string {
  if (userAction === "book_restaurant") {
    return `USER_WANTS_TO_BOOK: ${actionContext.restaurantName ?? "Unknown"}, Address: ${actionContext.address ?? ""}, ImageURL: ${actionContext.imageUrl ?? ""}`;
  } else if (userAction === "submit_booking") {
    return `User submitted a booking for ${actionContext.restaurantName ?? ""} for ${actionContext.partySize ?? ""} people at ${actionContext.reservationTime ?? ""}. Dietary: ${actionContext.dietary ?? ""}.`;
  } else if (userAction) {
    return `User action: ${userAction} with context: ${JSON.stringify(actionContext)}`;
  }
  return "";
}

function createBookingForm(
  actionContext: Record<string, unknown>,
  taskId: string,
  contextId: string,
): TaskStatusUpdateEvent {
  const surfaceId = "booking-form";
  const components = [
    {
      id: "booking-form-column",
      component: {
        Column: {
          children: {
            explicitList: [
              "booking-title",
              "restaurant-image",
              "restaurant-address",
              "party-size-field",
              "datetime-field",
              "dietary-field",
              "submit-button",
            ],
          },
        },
      },
    },
    {
      id: "booking-title",
      component: {
        Text: { text: { literalString: "Book a Table" }, usageHint: "h2" },
      },
    },
    {
      id: "restaurant-image",
      component: { Image: { url: { path: "imageUrl" } } },
    },
    {
      id: "restaurant-address",
      component: { Text: { text: { path: "address" } } },
    },
    {
      id: "party-size-field",
      component: {
        TextField: {
          label: { literalString: "Party Size" },
          text: { path: "partySize" },
        },
      },
    },
    {
      id: "datetime-field",
      component: {
        DateTimeInput: {
          label: { literalString: "Date & Time" },
          value: { path: "reservationTime" },
          enableDate: true,
          enableTime: true,
        },
      },
    },
    {
      id: "dietary-field",
      component: {
        TextField: {
          label: { literalString: "Dietary Requirements" },
          text: { path: "dietary" },
        },
      },
    },
    {
      id: "submit-button",
      component: {
        Button: {
          child: "submit-reservation-text",
          primary: true,
          action: {
            name: "submit_booking",
            context: [
              { key: "restaurantName", value: { path: "restaurantName" } },
              { key: "partySize", value: { path: "partySize" } },
              { key: "reservationTime", value: { path: "reservationTime" } },
              { key: "dietary", value: { path: "dietary" } },
              { key: "imageUrl", value: { path: "imageUrl" } },
            ],
          },
        },
      },
    },
    {
      id: "submit-reservation-text",
      component: {
        Text: { text: { literalString: "Submit Reservation" } },
      },
    },
  ];

  const dataContents = [
    { key: "title", valueString: "Book a Table" },
    { key: "address", valueString: String(actionContext.address ?? "") },
    {
      key: "restaurantName",
      valueString: String(actionContext.restaurantName ?? ""),
    },
    { key: "partySize", valueString: "2" },
    { key: "reservationTime", valueString: "" },
    { key: "dietary", valueString: "" },
    { key: "imageUrl", valueString: String(actionContext.imageUrl ?? "") },
  ];

  const a2uiMessages = [
    {
      beginRendering: {
        surfaceId,
        root: "booking-form-column",
        styles: { primaryColor: "#FF0000", font: "Roboto" },
      },
    },
    { surfaceUpdate: { surfaceId, components } },
    { dataModelUpdate: { surfaceId, path: "/", contents: dataContents } },
  ];

  const parts: Array<
    { kind: "text"; text: string } | ReturnType<typeof createA2UIPart>
  > = [];
  parts.push({
    kind: "text",
    text: `Please fill in the details to book at ${actionContext.restaurantName}.`,
  });
  for (const a2ui of a2uiMessages) {
    parts.push(createA2UIPart(a2ui));
  }

  return {
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
}

function createBookingConfirmation(
  actionContext: Record<string, unknown>,
  taskId: string,
  contextId: string,
): TaskStatusUpdateEvent {
  const surfaceId = "confirmation";

  const components = [
    {
      id: "confirmation-card",
      component: { Card: { child: "confirmation-column" } },
    },
    {
      id: "confirmation-column",
      component: {
        Column: {
          children: {
            explicitList: [
              "confirm-title",
              "confirm-image",
              "divider1",
              "confirm-details",
              "divider2",
              "confirm-dietary",
              "confirm-text",
            ],
          },
        },
      },
    },
    {
      id: "confirm-title",
      component: { Text: { text: { path: "title" }, usageHint: "h2" } },
    },
    {
      id: "confirm-image",
      component: { Image: { url: { path: "imageUrl" } } },
    },
    {
      id: "confirm-details",
      component: { Text: { text: { path: "bookingDetails" } } },
    },
    {
      id: "confirm-dietary",
      component: { Text: { text: { path: "dietaryRequirements" } } },
    },
    {
      id: "confirm-text",
      component: {
        Text: {
          text: { literalString: "We look forward to seeing you!" },
          usageHint: "h5",
        },
      },
    },
    { id: "divider1", component: { Divider: {} } },
    { id: "divider2", component: { Divider: {} } },
  ];

  const bookingDetails = `Table for ${actionContext.partySize ?? "2"} at ${actionContext.reservationTime ?? "TBD"}`;
  const dietaryRequirements = actionContext.dietary
    ? `Dietary requirements: ${actionContext.dietary}`
    : "";

  const dataContents = [
    { key: "title", valueString: "Booking Confirmed!" },
    { key: "bookingDetails", valueString: bookingDetails },
    { key: "dietaryRequirements", valueString: dietaryRequirements },
    { key: "imageUrl", valueString: String(actionContext.imageUrl ?? "") },
  ];

  const a2uiMessages = [
    {
      beginRendering: {
        surfaceId,
        root: "confirmation-card",
        styles: { primaryColor: "#FF0000", font: "Roboto" },
      },
    },
    { surfaceUpdate: { surfaceId, components } },
    { dataModelUpdate: { surfaceId, path: "/", contents: dataContents } },
  ];

  const parts: Array<
    { kind: "text"; text: string } | ReturnType<typeof createA2UIPart>
  > = [];
  parts.push({
    kind: "text",
    text: `Your reservation at ${actionContext.restaurantName} is confirmed!`,
  });
  for (const a2ui of a2uiMessages) {
    parts.push(createA2UIPart(a2ui));
  }

  return {
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
}

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
        // Extract action from forwardedProps
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

    // Try to extract action from message parts first (actions take priority over text)
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
        // Check for various action keys
        if ("userAction" in dataPart.data) {
          console.log(
            "[DEBUG] Found userAction in data part, value:",
            JSON.stringify(dataPart.data.userAction),
          );
          const ua = dataPart.data.userAction;
          // Handle both string and object formats
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

    // Only use text if no action was found
    if (!userAction) {
      for (const part of userMessage.parts) {
        if (part?.kind === "text") {
          query = part.text;
          break;
        }
      }
    }

    // If we got action from forwardedProps, generate query from it
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

    // Check if this is a user action from A2UI button click
    if (userAction === "book_restaurant" && actionContext.restaurantName) {
      const finalUpdate = createBookingForm(actionContext, taskId, contextId);
      eventBus.publish(finalUpdate);
      eventBus.finished();
      return;
    }

    // Handle booking submission - generate directly without LLM
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

    // Normal flow - call LLM to get restaurants
    const systemPrompt = getSystemPrompt();
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: query },
    ];

    let lastRestaurantResults: Array<{
      name: string;
      cuisine: string;
      location: string;
      address?: string;
      imageUrl?: string;
      rating?: number;
    }> = [];

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
        lastRestaurantResults = list;
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

    parseAgentResponse(content);

    const parts: Array<
      { kind: "text"; text: string } | ReturnType<typeof createA2UIPart>
    > = [];

    // Always use fallback A2UI generation when we have restaurant results
    // (our code produces correct A2UI, model attempts are unreliable)
    if (lastRestaurantResults.length > 0) {
      const surfaceId = "restaurant-list";

      // Use List component with template (matching official A2UI format)
      const components: Array<{
        id: string;
        component: Record<string, unknown>;
      }> = [];
      const dataContents: Array<{
        key: string;
        valueMap?: Array<{
          key: string;
          valueString?: string;
          valueNumber?: number;
        }>;
      }> = [];

      // Root container - uses List with template for dynamic rendering
      components.push({
        id: "root-column",
        component: {
          Column: {
            children: { explicitList: ["title-heading", "restaurant-list"] },
          },
        },
      });

      // Title
      components.push({
        id: "title-heading",
        component: {
          Text: {
            text: { literalString: "Recommended Restaurants" },
            usageHint: "h1",
          },
        },
      });

      // List with template - this is the proper way to render dynamic lists
      components.push({
        id: "restaurant-list",
        component: {
          List: {
            direction: "vertical",
            children: {
              template: {
                componentId: "restaurant-card",
                dataBinding: "/restaurants",
              },
            },
          },
        },
      });

      // Card template component
      components.push({
        id: "restaurant-card",
        component: {
          Card: {
            child: "card-content",
          },
        },
      });

      // Card content - Row with image and details
      components.push({
        id: "card-content",
        component: {
          Row: {
            children: { explicitList: ["card-image", "card-details"] },
          },
        },
      });

      // Image
      components.push({
        id: "card-image",
        component: {
          Image: {
            url: { path: "imageUrl" },
          },
        },
      });

      // Details column
      components.push({
        id: "card-details",
        component: {
          Column: {
            children: {
              explicitList: [
                "card-name",
                "card-cuisine",
                "card-address",
                "card-rating",
                "book-btn",
              ],
            },
          },
        },
      });

      // Name
      components.push({
        id: "card-name",
        component: {
          Text: {
            text: { path: "name" },
            usageHint: "h3",
          },
        },
      });

      // Cuisine
      components.push({
        id: "card-cuisine",
        component: {
          Text: {
            text: { path: "cuisine" },
            usageHint: "body",
          },
        },
      });

      // Address
      components.push({
        id: "card-address",
        component: {
          Text: {
            text: { path: "address" },
            usageHint: "caption",
          },
        },
      });

      // Rating
      components.push({
        id: "card-rating",
        component: {
          Text: {
            text: { path: "ratingText" },
            usageHint: "caption",
          },
        },
      });

      // Book button with action
      components.push({
        id: "book-btn-text",
        component: {
          Text: {
            text: { literalString: "Book" },
          },
        },
      });

      components.push({
        id: "book-btn",
        component: {
          Button: {
            child: "book-btn-text",
            primary: true,
            action: {
              name: "book_restaurant",
              context: [
                { key: "restaurantName", value: { path: "name" } },
                { key: "imageUrl", value: { path: "imageUrl" } },
                { key: "address", value: { path: "address" } },
              ],
            },
          },
        },
      });

      // Data model - restaurants array with nested valueMap
      const restaurantItems: Array<{
        key: string;
        valueMap: Array<{
          key: string;
          valueString?: string;
          valueNumber?: number;
        }>;
      }> = [];
      lastRestaurantResults.forEach((r, i) => {
        restaurantItems.push({
          key: `restaurant-${i}`,
          valueMap: [
            { key: "name", valueString: r.name },
            { key: "cuisine", valueString: r.cuisine },
            { key: "location", valueString: r.location },
            { key: "address", valueString: r.address || "" },
            {
              key: "ratingText",
              valueString: r.rating ? `Rating: ${r.rating}/5` : "",
            },
            { key: "imageUrl", valueString: r.imageUrl || "" },
          ],
        });
      });

      dataContents.push({
        key: "restaurants",
        valueMap: restaurantItems,
      });

      // Combine all A2UI messages - send each operation separately (A2AAgent processes them individually)
      const a2uiMessages = [
        {
          beginRendering: {
            surfaceId,
            root: "root-column",
            styles: { primaryColor: "#FF0000", font: "Roboto" },
          },
        },
        { surfaceUpdate: { surfaceId, components } },
        { dataModelUpdate: { surfaceId, path: "/", contents: dataContents } },
      ];

      // Send each A2UI message as a separate data part (A2AAgent expects this format)
      for (const a2ui of a2uiMessages) {
        parts.push(createA2UIPart(a2ui));
      }

      // Send response with A2UI only - don't pass through model text
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
      return;
    }

    // Normal flow - call LLM to get restaurants

    if (parts.length === 0) {
      // No results - show whatever the model says
      parts.push({ kind: "text", text: content.trim() || "Done." });
    }

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
