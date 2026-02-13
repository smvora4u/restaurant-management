import { useEffect, useState } from 'react';
import { useSubscription } from '@apollo/client';
import { MENU_ITEMS_UPDATED_SUBSCRIPTION } from '../graphql/subscriptions/menu';

interface UseMenuSubscriptionsProps {
  restaurantId?: string | null;
  onMenuItemsUpdated?: () => void;
  fallbackRefetch?: () => void;
}

export const useMenuSubscriptions = ({
  restaurantId,
  onMenuItemsUpdated,
  fallbackRefetch
}: UseMenuSubscriptionsProps) => {
  const [subscriptionErrors, setSubscriptionErrors] = useState<number>(0);
  const [usePolling, setUsePolling] = useState<boolean>(false);

  useEffect(() => {
    if (usePolling && fallbackRefetch) {
      const interval = setInterval(() => {
        fallbackRefetch();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [usePolling, fallbackRefetch]);

  const { data: menuItemsUpdatedData, error: menuItemsUpdatedError } = useSubscription(
    MENU_ITEMS_UPDATED_SUBSCRIPTION,
    {
      variables: { restaurantId: restaurantId || '' },
      skip: !restaurantId || usePolling,
      onError: (error) => {
        setSubscriptionErrors((prev) => {
          if (error.message.includes('Socket closed') || prev >= 4) {
            setUsePolling(true);
          }
          return prev + 1;
        });
      },
    }
  );

  if (menuItemsUpdatedError) {
    console.error('Menu items updated subscription error:', menuItemsUpdatedError);
  }

  useEffect(() => {
    if (menuItemsUpdatedData?.menuItemsUpdated && onMenuItemsUpdated) {
      onMenuItemsUpdated();
    }
  }, [menuItemsUpdatedData, onMenuItemsUpdated]);
};
