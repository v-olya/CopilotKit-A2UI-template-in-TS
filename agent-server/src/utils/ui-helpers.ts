import type { TaskStatusUpdateEvent } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

const A2UI_MIME_TYPE = "application/json+a2ui";
const A2UI_ACTIVITY_TYPE = "a2ui-surface";

interface A2ADataPart {
  kind: "data";
  data: Record<string, unknown>;
  metadata?: { mimeType?: string; activityType?: string };
}

function createA2UIPart(
  a2uiMessage: Record<string, unknown> | Record<string, unknown>[],
): A2ADataPart {
  // CopilotKit expects A2UI messages as a JSON array wrapped in an object
  const data = Array.isArray(a2uiMessage)
    ? { messages: a2uiMessage }
    : a2uiMessage;

  return {
    kind: "data",
    data,
    metadata: {
      mimeType: A2UI_MIME_TYPE,
      activityType: A2UI_ACTIVITY_TYPE,
    },
  };
}

export interface Restaurant {
  name: string;
  cuisine: string;
  location: string;
  address?: string;
  imageUrl?: string;
  rating?: number;
}

export function getQueryFromAction(
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

export function createBookingForm(
  actionContext: Record<string, unknown>,
  taskId: string,
  contextId: string,
): TaskStatusUpdateEvent {
  const surfaceId = String(
    actionContext.surfaceId ?? `booking-form-${uuidv4()}`,
  );
  const restaurantName = String(actionContext.restaurantName ?? "");

  const components = [
    {
      id: "root-wrapper",
      component: {
        Row: {
          children: { explicitList: ["booking-form-card"] },
          justifyContent: "center",
        },
      },
    },
    {
      id: "booking-form-card",
      component: {
        Card: {
          child: "booking-form-column",
          width: 400,
          flex: "0 0 auto",
        },
      },
    },
    {
      id: "booking-form-column",
      component: {
        Column: {
          children: {
            explicitList: [
              "booking-title",
              "restaurant-image",
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
        Text: {
          text: { path: "title" },
          usageHint: "h2",
        },
      },
    },
    {
      id: "restaurant-image",
      component: {
        Image: {
          url: { path: "imageUrl" },
        },
      },
    },
    {
      id: "party-size-field",
      component: {
        TextField: {
          label: { literalString: "Party Size" },
          text: { path: "partySize" },
          styles: {
            root: "a2ui-form-field",
          },
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
          styles: {
            root: "a2ui-form-field",
          },
        },
      },
    },
    {
      id: "dietary-field",
      component: {
        TextField: {
          label: { literalString: "Dietary Requirements" },
          text: { path: "dietary" },
          styles: {
            root: "a2ui-form-field",
          },
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
              { key: "surfaceId", value: { literalString: surfaceId } },
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
    { key: "title", valueString: `Book ${restaurantName}` },
    {
      key: "restaurantName",
      valueString: restaurantName,
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
        root: "root-wrapper",
        styles: {
          rootWrapper: "a2ui-root-wrapper",
          bookingFormCard: "a2ui-card",
          bookingFormColumn: "a2ui-booking-column",
          formField: "a2ui-form-field",
          inputField: "a2ui-input-field",
          submitButton: "a2ui-submit-button",
          bookingTitle: "a2ui-booking-title",
          formLabel: "a2ui-form-label",
        },
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
    text: `Please fill in the details to book at ${restaurantName}.`,
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

export function createBookingConfirmation(
  actionContext: Record<string, unknown>,
  taskId: string,
  contextId: string,
): TaskStatusUpdateEvent {
  const surfaceId = String(
    actionContext.surfaceId ?? `booking-form-${uuidv4()}`,
  );

  const components = [
    {
      id: "confirmation-row",
      component: {
        Row: {
          children: { explicitList: ["confirmation-card"] },
          justifyContent: "center",
        },
      },
    },
    {
      id: "confirmation-card",
      component: {
        Card: {
          child: "confirmation-column",
          width: 400,
          flex: "0 0 auto",
        },
      },
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

  const bookingDetails = `Table for ${actionContext.partySize ?? "2"} at ${actionContext.restaurantName ?? ""} on ${actionContext.reservationTime ?? "TBD"}`;
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
        root: "confirmation-row",
        styles: {
          confirmationRow: "a2ui-confirmation-row",
          confirmationCard: "a2ui-card",
          confirmationColumn: "a2ui-booking-column",
          confirmTitle: "a2ui-booking-title",
        },
      },
    },
    { surfaceUpdate: { surfaceId, components } },
    { dataModelUpdate: { surfaceId, path: "/", contents: dataContents } },
  ];

  const parts: Array<
    { kind: "text"; text: string } | ReturnType<typeof createA2UIPart>
  > = [];
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

export function createRestaurantListUI(
  surfaceId: string,
  restaurants: Restaurant[],
  taskId: string,
  contextId: string,
  isFinal: boolean = true,
  skipBeginRendering: boolean = false,
): TaskStatusUpdateEvent {
  const components: Array<{
    id: string;
    component: Record<string, unknown>;
  }> = [];

  components.push({
    id: "root-wrapper",
    component: {
      Row: {
        children: { explicitList: ["root-column"] },
        justifyContent: "center",
      },
    },
  });

  components.push({
    id: "root-column",
    component: {
      Column: {
        children: { explicitList: ["title-heading", "restaurant-list"] },
      },
    },
  });

  components.push({
    id: "title-heading",
    component: {
      Text: {
        text: { literalString: "Recommended Restaurants" },
        usageHint: "h1",
      },
    },
  });

  components.push({
    id: "restaurant-list",
    component: {
      List: {
        direction: "horizontal",
        flexWrap: true,
        justifyContent: "center",
        children: {
          template: {
            componentId: "restaurant-card",
            dataBinding: "/restaurants",
          },
        },
      },
    },
  });

  components.push({
    id: "restaurant-card",
    component: {
      Card: {
        child: "card-content",
        width: 400,
        flex: "0 0 auto",
        styles: {
          root: "a2ui-card",
        },
      },
    },
  });

  components.push({
    id: "card-content",
    component: {
      Row: {
        children: { explicitList: ["card-image", "card-details"] },
        gap: 16,
      },
    },
  });

  components.push({
    id: "card-image",
    component: {
      Image: {
        url: { path: "imageUrl" },
        styles: {
          root: "a2ui-card-image",
        },
      },
    },
  });

  components.push({
    id: "card-details",
    component: {
      Column: {
        children: {
          explicitList: [
            "card-name",
            "card-cuisine-row",
            "card-address-row",
            "card-rating-row",
            "book-btn",
          ],
        },
      },
    },
  });

  components.push({
    id: "card-name",
    component: {
      Text: {
        text: { path: "name" },
        usageHint: "h3",
      },
    },
  });

  components.push({
    id: "card-cuisine-row",
    component: {
      Row: {
        children: { explicitList: ["cuisine-label", "cuisine-value"] },
      },
    },
  });
  components.push({
    id: "cuisine-label",
    component: {
      Text: {
        text: { literalString: "Cuisine: " },
        styles: {
          root: "a2ui-card-label",
        },
      },
    },
  });
  components.push({
    id: "cuisine-value",
    component: {
      Text: {
        text: { path: "cuisine" },
      },
    },
  });

  components.push({
    id: "card-address-row",
    component: {
      Row: {
        children: { explicitList: ["address-label", "address-value"] },
      },
    },
  });
  components.push({
    id: "address-label",
    component: {
      Text: {
        text: { literalString: "Address: " },
        styles: {
          root: "a2ui-card-label",
        },
      },
    },
  });
  components.push({
    id: "address-value",
    component: {
      Text: {
        text: { path: "address" },
      },
    },
  });

  components.push({
    id: "card-rating-row",
    component: {
      Row: {
        children: { explicitList: ["rating-label", "rating-value"] },
      },
    },
  });
  components.push({
    id: "rating-label",
    component: {
      Text: {
        text: { literalString: "Rating: " },
        styles: {
          root: "a2ui-card-label",
        },
      },
    },
  });
  components.push({
    id: "rating-value",
    component: {
      Text: {
        text: { path: "rating" },
      },
    },
  });

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
            { key: "surfaceId", value: { literalString: surfaceId } },
            { key: "restaurantName", value: { path: "name" } },
            { key: "imageUrl", value: { path: "imageUrl" } },
            { key: "address", value: { path: "address" } },
          ],
        },
        styles: {
          root: "a2ui-card-book-button",
        },
      },
    },
  });

  const restaurantItems: Array<{
    key: string;
    valueMap: Array<{
      key: string;
      valueString?: string;
      valueNumber?: number;
    }>;
  }> = [];
  restaurants.forEach((r, i) => {
    restaurantItems.push({
      key: `restaurant-${i}`,
      valueMap: [
        { key: "name", valueString: r.name },
        { key: "cuisine", valueString: r.cuisine },
        { key: "location", valueString: r.location },
        { key: "address", valueString: r.address || "" },
        {
          key: "rating",
          valueNumber: r.rating || 0,
        },
        { key: "imageUrl", valueString: r.imageUrl || "" },
      ],
    });
  });

  const dataContents = [
    {
      key: "restaurants",
      valueMap: restaurantItems,
    },
  ];

  const a2uiMessages: Array<Record<string, unknown>> = [];

  if (!skipBeginRendering) {
    a2uiMessages.push({
      beginRendering: {
        surfaceId,
        root: "root-wrapper",
        styles: {
          rootWrapper: "a2ui-root-wrapper",
        },
      },
    });
  }

  a2uiMessages.push(
    { dataModelUpdate: { surfaceId, path: "/", contents: dataContents } },
    { surfaceUpdate: { surfaceId, components } },
  );

  const parts: Array<
    { kind: "text"; text: string } | ReturnType<typeof createA2UIPart>
  > = [];
  for (const a2ui of a2uiMessages) {
    parts.push(createA2UIPart(a2ui));
  }

  return {
    kind: "status-update",
    taskId,
    contextId,
    final: isFinal,
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
