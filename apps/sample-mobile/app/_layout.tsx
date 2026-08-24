import { useMemo, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NativeThemeProvider, AuthProvider, ToastProvider } from '@maw/ui-native';
import { client } from '../src/api';
import { restoreSession } from '../src/session';
import { EXAMPLE_RBAC } from '../src/rbac';

export default function RootLayout(): ReactNode {
  const rbac = useMemo(() => EXAMPLE_RBAC, []);

  return (
    <SafeAreaProvider>
      <NativeThemeProvider>
        <AuthProvider client={client} rbac={rbac} restore={restoreSession}>
          <ToastProvider>
            <StatusBar style="auto" />
            <Slot />
          </ToastProvider>
        </AuthProvider>
      </NativeThemeProvider>
    </SafeAreaProvider>
  );
}
