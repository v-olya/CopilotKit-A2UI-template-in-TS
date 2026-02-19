"use client";

import { CopilotPopup } from "@copilotkit/react-ui";
import { CopilotKit, useCopilotAction } from "@copilotkit/react-core";
import { useState, useCallback } from "react";
import {
  RestaurantList,
  BookingForm,
  Confirmation,
  Restaurant,
} from "./components";

export const dynamic = "force-dynamic";

const MOCK_RESTAURANTS: Restaurant[] = [
  {
    name: "The Italian Place",
    cuisine: "Italian",
    address: "123 Pasta St, New York",
    rating: 4.5,
    imageUrl:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
  },
  {
    name: "Sushi Zen",
    cuisine: "Japanese",
    address: "456 Sakura Rd, London",
    rating: 4.8,
    imageUrl:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop",
  },
  {
    name: "Burger Haven",
    cuisine: "American",
    address: "789 Patty Ave, London",
    rating: 4.2,
    imageUrl:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
  },
];

interface BookingData {
  restaurantName: string;
  partySize: string;
  reservationTime: string;
  dietary: string;
  address?: string;
  imageUrl?: string;
}

function RestaurantAssistant() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState<BookingData | null>(
    null,
  );

  const handleBook = useCallback((name: string) => {
    const r = MOCK_RESTAURANTS.find((res) => res.name === name);
    if (r) {
      setSelectedRestaurant(r);
    }
  }, []);

  useCopilotAction({
    name: "searchRestaurants",
    description:
      "Search for restaurants. Requires at least one filter: cuisine type or location. Call this when user specifies what kind of food or where they want to eat.",
    parameters: [
      {
        name: "cuisine",
        type: "string",
        description: "The type of cuisine (e.g., Italian, Japanese, American)",
      },
      {
        name: "location",
        type: "string",
        description: "The city or location (e.g., London, New York)",
      },
    ],
    handler: async ({ cuisine, location }) => {
      setSelectedRestaurant(null);
      setBookingConfirmed(null);

      const cuisineFilter =
        cuisine && cuisine.toLowerCase() !== "any"
          ? cuisine.toLowerCase()
          : null;
      const locationFilter =
        location && location.toLowerCase() !== "any"
          ? location.toLowerCase()
          : null;

      if (!cuisineFilter && !locationFilter) {
        setRestaurants([]);
        return [];
      }

      let filtered = MOCK_RESTAURANTS;

      if (cuisineFilter) {
        filtered = filtered.filter((r) =>
          r.cuisine.toLowerCase().includes(cuisineFilter),
        );
      }

      if (locationFilter) {
        filtered = filtered.filter((r) =>
          r.address.toLowerCase().includes(locationFilter),
        );
      }

      setRestaurants(filtered);
      return filtered;
    },
    render: ({ status }) => {
      if (status === "inProgress") {
        return <div>Searching...</div>;
      }
      return <></>;
    },
  });

  return (
    <main className="h-screen w-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-3 shrink-0 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Restaurant Assistant
        </h1>
        <CopilotPopup
          labels={{
            title: "Restaurant Assistant",
            initial: "Hi! I can help you find and book restaurants",
          }}
        />
      </header>
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
        <div className="w-full max-w-[900px] flex justify-center items-start">
          {bookingConfirmed ? (
            <Confirmation {...bookingConfirmed} />
          ) : selectedRestaurant ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setSelectedRestaurant(null)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ← Back to restaurants
              </button>
              <BookingForm
                restaurantName={selectedRestaurant.name}
                address={selectedRestaurant.address}
                imageUrl={selectedRestaurant.imageUrl}
                onSubmit={(data) => setBookingConfirmed(data)}
              />
            </div>
          ) : restaurants.length > 0 ? (
            <RestaurantList restaurants={restaurants} onBook={handleBook} />
          ) : (
            <p className="text-gray-400">Use the assistant to search for restaurants</p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <RestaurantAssistant />
    </CopilotKit>
  );
}
