import { useEffect } from 'react';
import { useSubscription } from '@apollo/client';
import { WAITLIST_UPDATED_SUBSCRIPTION } from '../graphql';

interface UseWaitlistSubscriptionProps {
  restaurantId: string;
  onWaitlistUpdated?: () => void;
}

export const useWaitlistSubscription = ({
  restaurantId,
  onWaitlistUpdated
}: UseWaitlistSubscriptionProps) => {
  const { data, error } = useSubscription(WAITLIST_UPDATED_SUBSCRIPTION, {
    variables: { restaurantId },
    skip: !restaurantId,
  });

  if (error) {
    console.error('Waitlist subscription error:', error);
  }

  useEffect(() => {
    if (data?.waitlistUpdated && onWaitlistUpdated) {
      onWaitlistUpdated();
    }
  }, [data, onWaitlistUpdated]);
};
