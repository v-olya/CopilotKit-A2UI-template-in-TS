"use client";

import React from "react";

export interface Restaurant {
  name: string;
  cuisine: string;
  address: string;
  rating?: number;
  imageUrl?: string;
}

export interface RestaurantCardProps {
  name: string;
  cuisine: string;
  address: string;
  rating?: number;
  imageUrl?: string;
  onBook?: (restaurantName: string) => void;
}

export function RestaurantCard({
  name,
  cuisine,
  address,
  rating,
  imageUrl,
  onBook,
}: RestaurantCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-32 object-cover"
        />
      )}
      <div className="p-3">
        <h3 className="font-semibold text-lg">{name}</h3>
        <p className="text-sm text-gray-600">{cuisine}</p>
        <p className="text-xs text-gray-500">{address}</p>
        {rating && (
          <p className="text-xs text-yellow-600">Rating: {rating}/5</p>
        )}
        {onBook && (
          <button
            onClick={() => onBook(name)}
            className="mt-2 w-full bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
          >
            Book
          </button>
        )}
      </div>
    </div>
  );
}

export interface RestaurantListProps {
  restaurants: Restaurant[];
  onBook?: (restaurantName: string) => void;
}

export function RestaurantList({ restaurants, onBook }: RestaurantListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {restaurants.map((restaurant, index) => (
        <RestaurantCard
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          {...restaurant}
          onBook={onBook}
        />
      ))}
    </div>
  );
}

export interface BookingFormProps {
  restaurantName: string;
  address?: string;
  imageUrl?: string;
  onSubmit?: (data: {
    restaurantName: string;
    partySize: string;
    reservationTime: string;
    dietary: string;
    address?: string;
    imageUrl?: string;
  }) => void;
  onAction?: (action: { name: string; context?: Record<string, unknown> }) => void;
}

export function BookingForm({
  restaurantName,
  address,
  imageUrl,
  onSubmit,
  onAction,
}: BookingFormProps) {
  const [partySize, setPartySize] = React.useState("2");
  const [reservationTime, setReservationTime] = React.useState("");
  const [dietary, setDietary] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { partySize, reservationTime, dietary, restaurantName, address, imageUrl };
    onSubmit?.(data);
    onAction?.({
      name: "submit_booking",
      context: data,
    });
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h2 className="text-xl font-bold mb-4">Book a Table at {restaurantName}</h2>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={restaurantName}
          className="w-full h-32 object-cover rounded mb-4"
        />
      )}
      {address && (
        <p className="text-sm text-gray-600 mb-4">{address}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Party Size</label>
          <select
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
            className="w-full border rounded p-2"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "person" : "people"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date & Time</label>
          <input
            type="datetime-local"
            value={reservationTime}
            onChange={(e) => setReservationTime(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Dietary Requirements</label>
          <input
            type="text"
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
            placeholder="Allergies, preferences, etc."
            className="w-full border rounded p-2"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors"
        >
          Submit Reservation
        </button>
      </form>
    </div>
  );
}

export interface ConfirmationProps {
  restaurantName: string;
  partySize: string;
  reservationTime: string;
  dietary?: string;
  imageUrl?: string;
}

export function Confirmation({
  restaurantName,
  partySize,
  reservationTime,
  dietary,
  imageUrl,
}: ConfirmationProps) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="text-center">
        <div className="text-green-600 text-4xl mb-2">✓</div>
        <h2 className="text-xl font-bold text-green-700">Booking Confirmed!</h2>
      </div>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={restaurantName}
          className="w-full h-32 object-cover rounded my-4"
        />
      )}
      <div className="space-y-2 mt-4">
        <p className="font-semibold">{restaurantName}</p>
        <p className="text-sm text-gray-600">
          Table for {partySize} at {reservationTime || "TBD"}
        </p>
        {dietary && (
          <p className="text-sm text-gray-500">
            Dietary requirements: {dietary}
          </p>
        )}
      </div>
      <p className="text-center text-sm text-gray-500 mt-4">
        We look forward to seeing you!
      </p>
    </div>
  );
}
