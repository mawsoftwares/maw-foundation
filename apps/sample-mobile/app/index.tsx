import { type ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useAuth, PageLoader } from '@maw/ui-native';

export default function Index(): ReactNode {
  const { session, loading } = useAuth();

  if (loading) return <PageLoader message="Restoring session..." />;
  if (session === null) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)" />;
}
