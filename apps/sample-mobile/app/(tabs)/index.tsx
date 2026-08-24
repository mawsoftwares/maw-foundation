import { type ReactNode } from 'react';
import { ScrollView, Text, View, type TextStyle } from 'react-native';
import { useAuth, useNativeTheme, Card, Badge, Stack, Avatar } from '@maw/ui-native';

export default function DashboardScreen(): ReactNode {
  const { session } = useAuth();
  const { styles: t } = useNativeTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.bgMuted }}
      contentContainerStyle={{ padding: t.spacing.lg }}
    >
      <Card style={{ marginBottom: t.spacing.lg }}>
        <Stack direction="row" align="center" gap={t.spacing.md}>
          <Avatar name={session?.userId ?? 'User'} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: t.typography.size.lg,
              fontWeight: t.typography.weight.semibold as TextStyle['fontWeight'],
              color: t.colors.fg,
              fontFamily: t.typography.fontFamily,
            }}>
              Welcome back
            </Text>
            <Stack direction="row" gap={t.spacing.sm} style={{ marginTop: t.spacing.xs }}>
              <Badge variant="info">{session?.role ?? 'user'}</Badge>
              <Text style={{
                fontSize: t.typography.size.sm,
                color: t.colors.fgMuted,
                fontFamily: t.typography.fontFamily,
              }}>
                {session?.tenantId ?? 'demo'}
              </Text>
            </Stack>
          </View>
        </Stack>
      </Card>

      <Text style={{
        fontSize: t.typography.size.md,
        fontWeight: t.typography.weight.semibold as TextStyle['fontWeight'],
        color: t.colors.fg,
        fontFamily: t.typography.fontFamily,
        marginBottom: t.spacing.md,
      }}>
        Quick Stats
      </Text>

      <Stack gap={t.spacing.md}>
        <Card>
          <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fgMuted, fontFamily: t.typography.fontFamily }}>
            Total Orders
          </Text>
          <Text style={{
            fontSize: t.typography.size.xl,
            fontWeight: t.typography.weight.bold as TextStyle['fontWeight'],
            color: t.colors.brand,
            fontFamily: t.typography.fontFamily,
          }}>
            156
          </Text>
        </Card>

        <Stack direction="row" gap={t.spacing.md}>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fgMuted, fontFamily: t.typography.fontFamily }}>
              Pending
            </Text>
            <Text style={{
              fontSize: t.typography.size.lg,
              fontWeight: t.typography.weight.bold as TextStyle['fontWeight'],
              color: t.colors.warning,
              fontFamily: t.typography.fontFamily,
            }}>
              12
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ fontSize: t.typography.size.sm, color: t.colors.fgMuted, fontFamily: t.typography.fontFamily }}>
              Delivered
            </Text>
            <Text style={{
              fontSize: t.typography.size.lg,
              fontWeight: t.typography.weight.bold as TextStyle['fontWeight'],
              color: t.colors.success,
              fontFamily: t.typography.fontFamily,
            }}>
              144
            </Text>
          </Card>
        </Stack>
      </Stack>
    </ScrollView>
  );
}
