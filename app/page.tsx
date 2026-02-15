"use client";

import { CopilotChat } from "@copilotkit/react-ui";
import {
  CopilotKit,
  useCopilotAction,
} from "@copilotkit/react-core";
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
  const [restaurants, setRestaurants] = useState<Restaurant[]>(MOCK_RESTAURANTS);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState<BookingData | null>(null);

  const handleBook = useCallback((name: string) => {
    const r = MOCK_RESTAURANTS.find((res) => res.name === name);
    if (r) {
      setSelectedRestaurant(r);
    }
  }, []);

  useCopilotAction({
    name: "searchRestaurants",
    description: "Search for restaurants by cuisine and/or location",
    parameters: [
      {
        name: "cuisine",
        type: "string",
        description: "The type of cuisine (e.g., Italian, Japanese)",
      },
      {
        name: "location",
        type: "string",
        description: "The location (e.g., London)",
      },
    ],
    handler: async ({ cuisine, location }) => {
      if (!cuisine && !location) {
        setRestaurants([]);
        return [];
      }

      let filtered = MOCK_RESTAURANTS;

      if (cuisine && cuisine.toLowerCase() !== "any") {
        filtered = filtered.filter((r) =>
          r.cuisine.toLowerCase().includes(cuisine.toLowerCase()),
        );
      }

      if (location && location.toLowerCase() !== "any") {
        filtered = filtered.filter((r) =>
          r.address.toLowerCase().includes(location.toLowerCase()),
        );
      }

      setRestaurants(filtered);
      return filtered;
    },
    render: ({ status, result }) => {
      if (status === "inProgress") {
        return <div>Searching...</div>;
      }

      const displayRestaurants = result || restaurants;

      return (
        <RestaurantList
          restaurants={displayRestaurants}
          onBook={handleBook}
        />
      );
    },
  });

  useCopilotAction({
    name: "bookRestaurant",
    description: "Book a table at a restaurant",
    parameters: [
      {
        name: "restaurantName",
        type: "string",
        description: "The name of the restaurant to book",
      },
    ],
    handler: async ({ restaurantName }) => {
      const r = MOCK_RESTAURANTS.find((res) => res.name === restaurantName);
      if (r) {
        setSelectedRestaurant(r);
        return { success: true, restaurant: r };
      }
      return { success: false, error: "Restaurant not found" };
    },
    render: () => {
      if (selectedRestaurant && !bookingConfirmed) {
        return (
          <BookingForm
            restaurantName={selectedRestaurant.name}
            address={selectedRestaurant.address}
            imageUrl={selectedRestaurant.imageUrl}
            onSubmit={(data) => {
              setBookingConfirmed(data);
            }}
          />
        );
      }

      if (bookingConfirmed) {
        return <Confirmation {...bookingConfirmed} />;
      }

      return <></>;
    },
  });

  return (
    <main className="h-screen w-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-3 shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">
          Restaurant Assistant
        </h1>
      </header>
      <CopilotChat
        className="flex-1 w-full m-0 rounded-none border-0 border-l shadow-none"
        labels={{
          title: "Restaurant Assistant",
          initial: "Hi! I can help you find and book restaurants. What are you looking for?",
        }}
      />
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
