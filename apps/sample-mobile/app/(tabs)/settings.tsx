import { type ReactNode } from 'react';
import { ScrollView, Text, View, type TextStyle } from 'react-native';
import {
  useAuth,
  useNativeTheme,
  Button,
  Card,
  Divider,
  Stack,
  Badge,
} from '@mawsoftwares/ui-native';

export default function SettingsScreen(): ReactNode {
  const { session, logout } = useAuth();
  const { styles: t, colorMode, isDark, setColorMode, toggleColorMode } = useNativeTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.bgMuted }}
      contentContainerStyle={{ padding: t.spacing.lg }}
    >
      <Card style={{ marginBottom: t.spacing.lg }}>
        <Text style={{
          fontSize: t.typography.size.md,
          fontWeight: t.typography.weight.semibold as TextStyle['fontWeight'],
          color: t.colors.fg,
          fontFamily: t.typography.fontFamily,
          marginBottom: t.spacing.md,
        }}>
          Account
        </Text>

        <Stack gap={t.spacing.sm}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fgMuted, fontFamily: t.typography.fontFamily }}>
              User ID
            </Text>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fg, fontFamily: t.typography.fontFamily }}>
              {session?.userId ?? '-'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fgMuted, fontFamily: t.typography.fontFamily }}>
              Tenant
            </Text>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fg, fontFamily: t.typography.fontFamily }}>
              {session?.tenantId ?? '-'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fgMuted, fontFamily: t.typography.fontFamily }}>
              Role
            </Text>
            <Badge variant="info">{session?.role ?? '-'}</Badge>
          </View>
        </Stack>
      </Card>

      <Card style={{ marginBottom: t.spacing.lg }}>
        <Text style={{
          fontSize: t.typography.size.md,
          fontWeight: t.typography.weight.semibold as TextStyle['fontWeight'],
          color: t.colors.fg,
          fontFamily: t.typography.fontFamily,
          marginBottom: t.spacing.md,
        }}>
          Appearance
        </Text>

        <Stack gap={t.spacing.sm}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fgMuted, fontFamily: t.typography.fontFamily }}>
              Color Mode
            </Text>
            <Badge>{colorMode}</Badge>
          </View>

          <Stack direction="row" gap={t.spacing.sm}>
            <Button
              variant={colorMode === 'light' ? 'primary' : 'ghost'}
              title="Light"
              onPress={() => setColorMode('light')}
              style={{ flex: 1 }}
            />
            <Button
              variant={colorMode === 'dark' ? 'primary' : 'ghost'}
              title="Dark"
              onPress={() => setColorMode('dark')}
              style={{ flex: 1 }}
            />
            <Button
              variant={colorMode === 'system' ? 'primary' : 'ghost'}
              title="System"
              onPress={() => setColorMode('system')}
              style={{ flex: 1 }}
            />
          </Stack>

          <Button
            variant="ghost"
            title={`Toggle (currently ${isDark ? 'dark' : 'light'})`}
            onPress={toggleColorMode}
          />
        </Stack>
      </Card>

      <Card style={{ marginBottom: t.spacing.lg }}>
        <Text style={{
          fontSize: t.typography.size.md,
          fontWeight: t.typography.weight.semibold as TextStyle['fontWeight'],
          color: t.colors.fg,
          fontFamily: t.typography.fontFamily,
          marginBottom: t.spacing.md,
        }}>
          About
        </Text>

        <Stack gap={t.spacing.sm}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fgMuted, fontFamily: t.typography.fontFamily }}>
              Platform
            </Text>
            <Badge>Expo / React Native</Badge>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fgMuted, fontFamily: t.typography.fontFamily }}>
              Foundation
            </Text>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fg, fontFamily: t.typography.fontFamily }}>
              MAW v0.1.0
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fgMuted, fontFamily: t.typography.fontFamily }}>
              Shared Packages
            </Text>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fg, fontFamily: t.typography.fontFamily }}>
              SDK, Auth, RBAC, API, Theme
            </Text>
          </View>
        </Stack>
      </Card>

      <Divider />

      <Button
        variant="danger"
        title="Sign Out"
        onPress={() => void logout()}
      />
    </ScrollView>
  );
}
