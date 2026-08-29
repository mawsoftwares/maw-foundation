import { type ReactNode } from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useNativeTheme } from '@mawsoftwares/ui-native';

export default function TabLayout(): ReactNode {
  const { styles: t } = useNativeTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.colors.brand,
        tabBarInactiveTintColor: t.colors.fgMuted,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.colors.border,
        },
        headerStyle: {
          backgroundColor: t.surface,
        },
        headerTintColor: t.colors.fg,
        headerTitleStyle: {
          fontFamily: t.typography.fontFamily,
          fontWeight: t.typography.weight.semibold as '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📦</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
