/**
 * In-memory restaurant data for the get_restaurants tool.
 */
export interface Restaurant {
  name: string;
  cuisine: string;
  location: string;
  address?: string;
  imageUrl?: string;
  rating?: number;
}

export const restaurants: Restaurant[] = [
  {
    name: "Golden Dragon",
    cuisine: "Chinese",
    location: "New York",
    address: "123 Main St",
    rating: 4.5,
  },
  {
    name: "Sichuan House",
    cuisine: "Chinese",
    location: "San Francisco",
    address: "456 Oak Ave",
    rating: 4.8,
  },
  {
    name: "Peking Garden",
    cuisine: "Chinese",
    location: "New York",
    address: "789 Broadway",
    rating: 4.2,
  },
  {
    name: "Le Bistro",
    cuisine: "French",
    location: "Paris",
    address: "1 Rue de la Paix",
    rating: 4.9,
  },
  {
    name: "Trattoria Roma",
    cuisine: "Italian",
    location: "Chicago",
    address: "321 Elm St",
    rating: 4.6,
  },
  {
    name: "Sushi Zen",
    cuisine: "Japanese",
    location: "Los Angeles",
    address: "555 Sunset Blvd",
    rating: 4.7,
  },
  {
    name: "Taco Loco",
    cuisine: "Mexican",
    location: "Austin",
    address: "100 Congress Ave",
    rating: 4.4,
  },
  {
    name: "Spice India",
    cuisine: "Indian",
    location: "London",
    address: "42 Curry Lane",
    rating: 4.5,
  },
];

export function getRestaurants(options: {
  cuisine?: string;
  location?: string;
  count?: number;
}): Restaurant[] {
  let list = [...restaurants];

  if (options.cuisine) {
    const c = options.cuisine.toLowerCase();
    list = list.filter((r) => r.cuisine.toLowerCase().includes(c));
  }

  if (options.location) {
    const l = options.location.toLowerCase();
    list = list.filter((r) => r.location.toLowerCase().includes(l));
  }
  const count = Math.min(options.count ?? 10, list.length);
  return list.slice(0, count);
}
