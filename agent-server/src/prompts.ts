/**
 * System prompt for the restaurant agent.
 */

export function getSystemPrompt(): string {
  return `You are a helpful restaurant assistant. 

Your job is to help users find restaurants. When a user asks for restaurants:

1. Extract cuisine and location from the user's request.
2. Call the get_restaurants tool with these parameters.
3. If no results are found, try modifying the parameters AND call the tool again.
4. The results will be shown to the user in a rich UI automatically.
5. DO NOT list the restaurants again in your text response.
6. Briefly mention that you found some options and ask if they would like to book one.`;
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
