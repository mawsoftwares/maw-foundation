import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
// Import api client assuming standard MAW foundation setup
// import { api } from '@mawsoftwares/api-client';

interface FeatureFlagContextValue {
  flags: Record<string, boolean>;
  isLoading: boolean;
  error: Error | null;
  isEnabled: (flagKey: string) => boolean;
  refresh: () => Promise<void>;
  _demoToggleFlag?: (key: string, enabled: boolean) => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined);

export interface FeatureFlagProviderProps {
  children: ReactNode;
  fetchFlags?: () => Promise<Record<string, boolean>>; // Optional override for data fetching
}

export function FeatureFlagProvider({ children, fetchFlags }: FeatureFlagProviderProps) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFlags = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (fetchFlags) {
        const fetched = await fetchFlags();
        setFlags(fetched);
      } else {
        // Fallback or actual MAW API call
        // const response = await api.get('/feature-flags/effective');
        // setFlags(response.data.features);
      }
    } catch (err: any) {
      console.error('Failed to load feature flags', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<FeatureFlagContextValue>(() => ({
    flags,
    isLoading,
    error,
    isEnabled: (flagKey: string) => !!flags[flagKey],
    refresh: loadFlags,
    _demoToggleFlag: (key, enabled) => setFlags(prev => ({ ...prev, [key]: enabled })),
  }), [flags, isLoading, error]);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}

export function useFeatureFlag(flagKey: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flagKey);
}

export function FeatureGuard({ 
  flagKey, 
  fallback = null, 
  children 
}: { 
  flagKey: string, 
  fallback?: ReactNode, 
  children: ReactNode 
}) {
  const isEnabled = useFeatureFlag(flagKey);
  if (!isEnabled) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
