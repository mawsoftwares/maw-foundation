import { type ReactNode } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useNativeTheme } from './theme';

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  readonly variant?: 'primary' | 'ghost' | 'danger';
  readonly title: string;
  readonly loading?: boolean;
  readonly style?: ViewStyle;
  readonly textStyle?: TextStyle;
}

export function Button({
  variant = 'primary',
  title,
  loading = false,
  disabled,
  style,
  textStyle,
  ...props
}: ButtonProps): ReactNode {
  const { styles: t } = useNativeTheme();
  const isDisabled = disabled === true || loading;

  const variantStyles: Record<string, { bg: string; fg: string; borderColor?: string }> = {
    primary: { bg: t.colors.brand, fg: t.colors.brandContrast },
    ghost: { bg: 'transparent', fg: t.colors.fg, borderColor: t.colors.border },
    danger: { bg: t.colors.danger, fg: '#ffffff' },
  };
  const v = variantStyles[variant] ?? variantStyles.primary!;

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => ({
        backgroundColor: v.bg,
        borderWidth: v.borderColor ? 1 : 0,
        borderColor: v.borderColor,
        borderRadius: t.radius.md,
        paddingVertical: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        opacity: isDisabled ? 0.6 : pressed ? 0.8 : 1,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        ...(style as object),
      })}
    >
      <Text style={{
        color: v.fg,
        fontSize: t.typography.size.md,
        fontWeight: t.typography.weight.semibold as TextStyle['fontWeight'],
        fontFamily: t.typography.fontFamily,
        ...(textStyle as object),
      }}>
        {loading ? 'Loading...' : title}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// TextField
// ---------------------------------------------------------------------------

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  readonly label?: string;
  readonly error?: string;
  readonly style?: ViewStyle;
  readonly inputStyle?: TextStyle;
}

export function TextField({ label, error, style, inputStyle, ...props }: TextFieldProps): ReactNode {
  const { styles: t } = useNativeTheme();

  return (
    <View style={{ marginBottom: t.spacing.md, ...(style as object) }}>
      {label != null && (
        <Text style={{
          marginBottom: t.spacing.xs,
          fontSize: t.typography.size.sm,
          color: t.colors.fgMuted,
          fontFamily: t.typography.fontFamily,
        }}>
          {label}
        </Text>
      )}
      <TextInput
        {...props}
        placeholderTextColor={t.colors.fgSubtle}
        style={{
          borderWidth: 1,
          borderColor: error ? t.colors.danger : t.colors.border,
          borderRadius: t.radius.md,
          paddingVertical: t.spacing.sm,
          paddingHorizontal: t.spacing.md,
          fontSize: t.typography.size.md,
          color: t.colors.fg,
          backgroundColor: t.surface,
          fontFamily: t.typography.fontFamily,
          ...(inputStyle as object),
        }}
      />
      {error != null && (
        <Text style={{
          marginTop: t.spacing.xs,
          fontSize: t.typography.size.xs,
          color: t.colors.danger,
          fontFamily: t.typography.fontFamily,
        }}>
          {error}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface CardProps {
  readonly children: ReactNode;
  readonly style?: ViewStyle;
}

export function Card({ children, style }: CardProps): ReactNode {
  const { styles: t } = useNativeTheme();

  return (
    <View style={{
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      padding: t.spacing.xl,
      ...t.shadows.sm,
      ...(style as object),
    }}>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export interface BadgeProps {
  readonly variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
  readonly children: ReactNode;
  readonly style?: ViewStyle;
}

export function Badge({ variant = 'default', children, style }: BadgeProps): ReactNode {
  const { styles: t } = useNativeTheme();

  const colorMap: Record<string, { bg: string; fg: string }> = {
    default: { bg: t.colors.bgMuted, fg: t.colors.fgMuted },
    success: { bg: t.colors.successBg, fg: t.colors.success },
    danger: { bg: t.colors.dangerBg, fg: t.colors.danger },
    warning: { bg: t.colors.warningBg, fg: t.colors.warning },
    info: { bg: t.colors.infoBg, fg: t.colors.info },
  };
  const c = colorMap[variant] ?? colorMap.default!;

  return (
    <View style={{
      backgroundColor: c.bg,
      borderRadius: t.radius.pill,
      paddingVertical: 2,
      paddingHorizontal: t.spacing.sm,
      alignSelf: 'flex-start' as const,
      ...(style as object),
    }}>
      <Text style={{
        color: c.fg,
        fontSize: t.typography.size.xs,
        fontWeight: t.typography.weight.medium as TextStyle['fontWeight'],
        fontFamily: t.typography.fontFamily,
      }}>
        {children}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

export interface DividerProps {
  readonly style?: ViewStyle;
}

export function Divider({ style }: DividerProps): ReactNode {
  const { styles: t } = useNativeTheme();

  return (
    <View style={{
      height: 1,
      backgroundColor: t.colors.border,
      marginVertical: t.spacing.lg,
      ...(style as object),
    }} />
  );
}
