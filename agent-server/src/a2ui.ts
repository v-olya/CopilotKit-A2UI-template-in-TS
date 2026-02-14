/**
 * A2UI part helpers for A2A protocol.
 * MIME type and structure match what @copilotkit/a2ui-renderer expects (a2ui-surface activity).
 */
export const A2UI_EXTENSION_URI = "https://a2ui.org/a2a-extension/a2ui/v0.8";
export const A2UI_MIME_TYPE = "application/json+a2ui";
export const A2UI_ACTIVITY_TYPE = "a2ui-surface";

export interface A2ADataPart {
  kind: "data";
  data: Record<string, unknown>;
  metadata?: { mimeType?: string; activityType?: string };
}

export function createA2UIPart(a2uiMessage: Record<string, unknown> | Record<string, unknown>[]): A2ADataPart {
  // CopilotKit expects A2UI messages as a JSON array wrapped in an object
  const data = Array.isArray(a2uiMessage) 
    ? { messages: a2uiMessage } 
    : a2uiMessage;
  
  return {
    kind: "data",
    data,
    metadata: { 
      mimeType: A2UI_MIME_TYPE,
      activityType: A2UI_ACTIVITY_TYPE 
    },
  };
}

const A2UI_DELIMITER = "---a2ui_JSON---";

export function parseAgentResponse(content: string): {
  text: string;
  a2uiMessages: Record<string, unknown>[];
} {
  let a2uiMessages: Record<string, unknown>[] = [];
  if (!content.includes(A2UI_DELIMITER)) {
    return { text: content.trim(), a2uiMessages };
  }
  const [textPart, jsonPart] = content.split(A2UI_DELIMITER, 2);
  const cleaned = (jsonPart ?? "").trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  if (!cleaned) {
    return { text: (textPart ?? "").trim(), a2uiMessages };
  }
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    a2uiMessages = Array.isArray(parsed) ? parsed as Record<string, unknown>[] : [parsed as Record<string, unknown>];
  } catch {
    // invalid JSON - treat as text only
    return { text: content.trim(), a2uiMessages: [] };
  }
  return { text: (textPart ?? "").trim(), a2uiMessages };
}
