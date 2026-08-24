import { type ReactNode } from 'react';
import { Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useNativeTheme } from './theme';
import { Button } from './components';
import { Spinner } from './ui-kit';

// ---------------------------------------------------------------------------
// ErrorState
// ---------------------------------------------------------------------------

export interface ErrorStateProps {
  readonly title?: string;
  readonly message?: string;
  readonly retry?: () => void;
  readonly style?: ViewStyle;
}

export function ErrorState({ title = 'Error', message, retry, style }: ErrorStateProps): ReactNode {
  const { styles: t } = useNativeTheme();

  return (
    <View style={{
      alignItems: 'center',
      padding: t.spacing.xxl,
      ...(style as object),
    }}>
      <Text style={{ fontSize: 48, marginBottom: t.spacing.md }}>⚠</Text>
      <Text style={{
        fontSize: t.typography.size.lg,
        fontWeight: t.typography.weight.semibold as TextStyle['fontWeight'],
        color: t.colors.fg,
        fontFamily: t.typography.fontFamily,
      }}>
        {title}
      </Text>
      {message != null && (
        <Text style={{
          marginTop: t.spacing.sm,
          fontSize: t.typography.size.sm,
          color: t.colors.fgMuted,
          fontFamily: t.typography.fontFamily,
          textAlign: 'center',
        }}>
          {message}
        </Text>
      )}
      {retry != null && (
        <View style={{ marginTop: t.spacing.lg }}>
          <Button variant="ghost" title="Try again" onPress={retry} />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  readonly icon?: string;
  readonly title?: string;
  readonly message?: string;
  readonly action?: ReactNode;
  readonly style?: ViewStyle;
}

export function EmptyState({
  icon = '📭',
  title = 'Nothing here yet',
  message,
  action,
  style,
}: EmptyStateProps): ReactNode {
  const { styles: t } = useNativeTheme();

  return (
    <View style={{
      alignItems: 'center',
      padding: t.spacing.xxl,
      ...(style as object),
    }}>
      <Text style={{ fontSize: 48, marginBottom: t.spacing.md }}>{icon}</Text>
      <Text style={{
        fontSize: t.typography.size.lg,
        fontWeight: t.typography.weight.semibold as TextStyle['fontWeight'],
        color: t.colors.fg,
        fontFamily: t.typography.fontFamily,
      }}>
        {title}
      </Text>
      {message != null && (
        <Text style={{
          marginTop: t.spacing.sm,
          fontSize: t.typography.size.sm,
          color: t.colors.fgMuted,
          fontFamily: t.typography.fontFamily,
          textAlign: 'center',
        }}>
          {message}
        </Text>
      )}
      {action != null && (
        <View style={{ marginTop: t.spacing.lg }}>{action}</View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// PageLoader
// ---------------------------------------------------------------------------

export interface PageLoaderProps {
  readonly message?: string;
}

export function PageLoader({ message }: PageLoaderProps): ReactNode {
  const { styles: t } = useNativeTheme();

  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.md,
    }}>
      <Spinner size="large" />
      {message != null && (
        <Text style={{
          fontSize: t.typography.size.sm,
          color: t.colors.fgMuted,
          fontFamily: t.typography.fontFamily,
        }}>
          {message}
        </Text>
      )}
    </View>
  );
}
