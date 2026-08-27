import { type ReactNode } from 'react';
import { Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useNativeTheme } from './theme';
import type { NetworkStatus } from '@mawsoftwares/sdk/contracts/INetworkManager';

// ---------------------------------------------------------------------------
// NetworkStatusBadge
// ---------------------------------------------------------------------------

export interface NetworkStatusBadgeProps {
  readonly status: NetworkStatus;
  readonly style?: ViewStyle;
}

export function NetworkStatusBadge({ status, style }: NetworkStatusBadgeProps): ReactNode {
  const { styles: t } = useNativeTheme();

  if (status === 'online') return null;

  const label = status === 'offline' ? 'Offline' : 'Slow Connection';
  const bg = status === 'offline' ? t.colors.dangerBg : t.colors.warningBg;
  const fg = status === 'offline' ? t.colors.danger : t.colors.warning;

  return (
    <View style={{
      backgroundColor: bg,
      borderRadius: t.radius.pill,
      paddingVertical: 2,
      paddingHorizontal: t.spacing.sm,
      ...(style as object),
    }}>
      <Text style={{
        color: fg,
        fontSize: t.typography.size.xs,
        fontWeight: t.typography.weight.medium as TextStyle['fontWeight'],
        fontFamily: t.typography.fontFamily,
      }}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// OfflineBanner
// ---------------------------------------------------------------------------

export interface OfflineBannerProps {
  readonly status: NetworkStatus;
  readonly message?: string;
  readonly style?: ViewStyle;
}

export function OfflineBanner({ status, message, style }: OfflineBannerProps): ReactNode {
  const { styles: t } = useNativeTheme();

  if (status === 'online') return null;

  const defaultMessage = status === 'offline'
    ? 'You are offline. Changes will sync when connected.'
    : 'Connection is slow. Some features may be limited.';

  return (
    <View style={{
      backgroundColor: status === 'offline' ? t.colors.danger : t.colors.warning,
      paddingVertical: t.spacing.sm,
      paddingHorizontal: t.spacing.lg,
      ...(style as object),
    }}>
      <Text style={{
        color: '#ffffff',
        fontSize: t.typography.size.sm,
        fontFamily: t.typography.fontFamily,
        textAlign: 'center',
      }}>
        {message ?? defaultMessage}
      </Text>
    </View>
  );
}
