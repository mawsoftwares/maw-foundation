import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
  type ImageSourcePropType,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useNativeTheme } from './theme';

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

export interface SpinnerProps {
  readonly size?: number | 'small' | 'large';
  readonly color?: string;
  readonly style?: ViewStyle;
}

export function Spinner({ size = 'small', color, style }: SpinnerProps): ReactNode {
  const { styles: t } = useNativeTheme();
  return <ActivityIndicator size={size} color={color ?? t.colors.brand} style={style} />;
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

export interface AvatarProps {
  readonly name: string;
  readonly src?: ImageSourcePropType;
  readonly size?: number;
  readonly style?: ViewStyle;
}

export function Avatar({ name, src, size = 40, style }: AvatarProps): ReactNode {
  const { styles: t } = useNativeTheme();
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  if (src) {
    return (
      <Image
        source={src}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          ...(style as object),
        }}
      />
    );
  }

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: t.colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
      ...(style as object),
    }}>
      <Text style={{
        color: t.colors.brandContrast,
        fontSize: size * 0.4,
        fontWeight: t.typography.weight.semibold as TextStyle['fontWeight'],
        fontFamily: t.typography.fontFamily,
      }}>
        {initials}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// IconButton
// ---------------------------------------------------------------------------

export interface IconButtonProps extends Omit<PressableProps, 'style'> {
  readonly icon: string;
  readonly size?: number;
  readonly color?: string;
  readonly style?: ViewStyle;
}

export function IconButton({ icon, size = 24, color, style, ...props }: IconButtonProps): ReactNode {
  const { styles: t } = useNativeTheme();

  return (
    <Pressable
      {...props}
      style={({ pressed }) => ({
        width: size + t.spacing.md * 2,
        height: size + t.spacing.md * 2,
        borderRadius: (size + t.spacing.md * 2) / 2,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        opacity: pressed ? 0.6 : 1,
        ...(style as object),
      })}
    >
      <Text style={{ fontSize: size, color: color ?? t.colors.fgMuted }}>
        {icon}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------

export interface StackProps {
  readonly direction?: 'row' | 'column';
  readonly gap?: number;
  readonly align?: ViewStyle['alignItems'];
  readonly justify?: ViewStyle['justifyContent'];
  readonly style?: ViewStyle;
  readonly children: ReactNode;
}

export function Stack({
  direction = 'column',
  gap,
  align,
  justify,
  style,
  children,
}: StackProps): ReactNode {
  const { styles: t } = useNativeTheme();

  return (
    <View style={{
      flexDirection: direction,
      gap: gap ?? t.spacing.md,
      alignItems: align,
      justifyContent: justify,
      ...(style as object),
    }}>
      {children}
    </View>
  );
}
