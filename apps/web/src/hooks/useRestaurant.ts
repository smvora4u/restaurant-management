import { useState, useEffect } from 'react';

interface Restaurant {
  id: string;
  name: string;
  email: string;
  slug: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}

export function useRestaurant() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRestaurant = () => {
      try {
        const restaurantData = localStorage.getItem('restaurant');
        if (restaurantData) {
          const parsedRestaurant = JSON.parse(restaurantData);
          setRestaurant(parsedRestaurant);
        }
      } catch (error) {
        console.error('Error loading restaurant data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRestaurant();
  }, []);

  const getRestaurantId = (): string | null => {
    return restaurant?.id || null;
  };

  const getRestaurantSlug = (): string | null => {
    return restaurant?.slug || null;
  };

  const isRestaurantLoaded = (): boolean => {
    return !loading && restaurant !== null;
  };

  return {
    restaurant,
    loading,
    getRestaurantId,
    getRestaurantSlug,
    isRestaurantLoaded,
  };
}
