import { useEffect, useState } from 'react';
import { useSubscription } from '@apollo/client';
import { FEE_LEDGER_UPDATED_SUBSCRIPTION, PAYMENT_STATUS_UPDATED_SUBSCRIPTION, DUE_FEES_UPDATED_SUBSCRIPTION } from '../graphql/subscriptions/fees';

interface UseFeeSubscriptionsProps {
  restaurantId?: string;
  onFeeLedgerUpdated?: (feeLedger: any) => void;
  onPaymentStatusUpdated?: (feeLedger: any) => void;
  onDueFeesUpdated?: (update: any) => void;
  fallbackRefetch?: () => void; // Fallback function to call when subscriptions fail
}

export const useFeeSubscriptions = ({
  restaurantId,
  onFeeLedgerUpdated,
  onPaymentStatusUpdated,
  onDueFeesUpdated,
  fallbackRefetch
}: UseFeeSubscriptionsProps) => {
  console.log('Setting up fee subscriptions for restaurantId:', restaurantId);
  
  const [subscriptionErrors, setSubscriptionErrors] = useState<number>(0);
  const [usePolling, setUsePolling] = useState<boolean>(false);

  // Fallback polling when subscriptions fail
  useEffect(() => {
    if (usePolling && fallbackRefetch) {
      console.log('Using fallback polling for fee updates');
      const interval = setInterval(() => {
        fallbackRefetch();
      }, 10000); // Poll every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [usePolling, fallbackRefetch]);

  const { data: feeLedgerUpdatedData, error: feeLedgerUpdatedError } = useSubscription(FEE_LEDGER_UPDATED_SUBSCRIPTION, {
    skip: !restaurantId || usePolling,
    onError: (error) => {
      console.error('Fee ledger subscription error:', error);
      setSubscriptionErrors(prev => prev + 1);
      if (error.message.includes('Socket closed') || subscriptionErrors > 2) {
        console.warn('WebSocket connection issues detected. Enabling fallback polling.');
        setUsePolling(true);
      }
    },
    onComplete: () => {
      console.log('Fee ledger subscription completed');
    }
  });

  const { data: paymentStatusUpdatedData, error: paymentStatusUpdatedError } = useSubscription(PAYMENT_STATUS_UPDATED_SUBSCRIPTION, {
    skip: !restaurantId || usePolling,
    onError: (error) => {
      console.error('Payment status subscription error:', error);
      setSubscriptionErrors(prev => prev + 1);
      if (error.message.includes('Socket closed') || subscriptionErrors > 2) {
        console.warn('WebSocket connection issues detected. Enabling fallback polling.');
        setUsePolling(true);
      }
    },
    onComplete: () => {
      console.log('Payment status subscription completed');
    }
  });

  const { data: dueFeesUpdatedData, error: dueFeesUpdatedError } = useSubscription(DUE_FEES_UPDATED_SUBSCRIPTION, {
    variables: { restaurantId: restaurantId || '' },
    skip: !restaurantId || usePolling,
    onError: (error) => {
      console.error('Due fees subscription error:', error);
      setSubscriptionErrors(prev => prev + 1);
      if (error.message.includes('Socket closed') || subscriptionErrors > 2) {
        console.warn('WebSocket connection issues detected. Enabling fallback polling.');
        setUsePolling(true);
      }
    },
    onComplete: () => {
      console.log('Due fees subscription completed');
    }
  });

  // Log subscription errors
  if (feeLedgerUpdatedError) console.error('Fee ledger updated subscription error:', feeLedgerUpdatedError);
  if (paymentStatusUpdatedError) console.error('Payment status updated subscription error:', paymentStatusUpdatedError);
  if (dueFeesUpdatedError) console.error('Due fees updated subscription error:', dueFeesUpdatedError);

  useEffect(() => {
    if (feeLedgerUpdatedData?.feeLedgerUpdated && onFeeLedgerUpdated) {
      console.log('Fee ledger updated received:', feeLedgerUpdatedData.feeLedgerUpdated);
      onFeeLedgerUpdated(feeLedgerUpdatedData.feeLedgerUpdated);
    }
  }, [feeLedgerUpdatedData, onFeeLedgerUpdated]);

  useEffect(() => {
    if (paymentStatusUpdatedData?.paymentStatusUpdated && onPaymentStatusUpdated) {
      console.log('Payment status updated received:', paymentStatusUpdatedData.paymentStatusUpdated);
      onPaymentStatusUpdated(paymentStatusUpdatedData.paymentStatusUpdated);
    }
  }, [paymentStatusUpdatedData, onPaymentStatusUpdated]);

  useEffect(() => {
    if (dueFeesUpdatedData?.dueFeesUpdated && onDueFeesUpdated) {
      console.log('Due fees updated received:', dueFeesUpdatedData.dueFeesUpdated);
      onDueFeesUpdated(dueFeesUpdatedData.dueFeesUpdated);
    }
  }, [dueFeesUpdatedData, onDueFeesUpdated]);
};
