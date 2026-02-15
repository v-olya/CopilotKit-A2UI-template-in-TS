/**
 * System prompt for the restaurant agent.
 */

export function getSystemPrompt(): string {
  return `You are a helpful restaurant assistant. 

Your job is to help users find restaurants. When a user asks for restaurants:

1. Call the get_restaurants tool with appropriate filters (cuisine, location, count)
2. After getting results, respond with a friendly summary

That's it - just call the tool and summarize the results.`;
}

export const GET_RESTAURANTS_TOOL = {
  type: "function" as const,
  function: {
    name: "get_restaurants",
    description:
      "Get a list of restaurants by optional cuisine, location, and maximum count.",
    parameters: {
      type: "object" as const,
      properties: {
        cuisine: {
          type: "string",
          description: "Filter by cuisine type (e.g. Chinese, Italian)",
        },
        location: { type: "string", description: "Filter by city or region" },
        count: {
          type: "number",
          description: "Max number of restaurants to return (default 10)",
        },
      },
      required: [] as string[],
    },
  },
};
