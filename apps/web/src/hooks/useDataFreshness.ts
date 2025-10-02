import { useState, useEffect, useCallback } from 'react';

interface UseDataFreshnessOptions {
  staleThreshold?: number; // in milliseconds, default 5 minutes
  checkInterval?: number; // in milliseconds, default 1 minute
  onStaleData?: () => void;
}

interface UseDataFreshnessReturn {
  lastDataFetch: number;
  dataStaleWarning: boolean;
  checkDataFreshness: () => boolean;
  updateDataFetchTime: () => void;
  refetchAllData: (refetchFunctions: (() => Promise<any>)[]) => Promise<void>;
}

export const useDataFreshness = (options: UseDataFreshnessOptions = {}): UseDataFreshnessReturn => {
  const {
    staleThreshold = 5 * 60 * 1000, // 5 minutes
    checkInterval = 60000, // 1 minute
    onStaleData
  } = options;

  const [lastDataFetch, setLastDataFetch] = useState<number>(Date.now());
  const [dataStaleWarning, setDataStaleWarning] = useState(false);

  const checkDataFreshness = useCallback(() => {
    const now = Date.now();
    
    if (now - lastDataFetch > staleThreshold) {
      setDataStaleWarning(true);
      onStaleData?.();
      return true; // Data is stale
    }
    return false; // Data is fresh
  }, [lastDataFetch, staleThreshold, onStaleData]);

  const updateDataFetchTime = useCallback(() => {
    setLastDataFetch(Date.now());
    setDataStaleWarning(false);
  }, []);

  const refetchAllData = useCallback(async (refetchFunctions: (() => Promise<any>)[]) => {
    try {
      await Promise.all(refetchFunctions.map(refetch => refetch()));
      updateDataFetchTime();
    } catch (error) {
      console.error('Error refreshing data:', error);
      throw error;
    }
  }, [updateDataFetchTime]);

  // Periodic data freshness check
  useEffect(() => {
    const interval = setInterval(() => {
      checkDataFreshness();
    }, checkInterval);

    return () => clearInterval(interval);
  }, [checkDataFreshness, checkInterval]);

  return {
    lastDataFetch,
    dataStaleWarning,
    checkDataFreshness,
    updateDataFetchTime,
    refetchAllData
  };
};
