import { useCallback, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  type ListRenderItemInfo,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useNativeTheme } from './theme';
import { EmptyState } from './states';

// ---------------------------------------------------------------------------
// DataList — typed FlatList wrapper (analogous to DataTable on web)
// ---------------------------------------------------------------------------

export interface DataListColumn<T> {
  readonly key: string;
  readonly title: string;
  readonly render: (item: T) => ReactNode;
  readonly flex?: number;
}

export interface DataListProps<T> {
  readonly data: readonly T[];
  readonly columns: readonly DataListColumn<T>[];
  readonly keyExtractor: (item: T) => string;
  readonly onPress?: (item: T) => void;
  readonly refreshing?: boolean;
  readonly onRefresh?: () => void;
  readonly emptyTitle?: string;
  readonly emptyMessage?: string;
  readonly header?: ReactNode;
  readonly style?: ViewStyle;
}

export function DataList<T>({
  data,
  columns,
  keyExtractor,
  onPress,
  refreshing = false,
  onRefresh,
  emptyTitle,
  emptyMessage,
  header,
  style,
}: DataListProps<T>): ReactNode {
  const { styles: t } = useNativeTheme();

  const renderItem = useCallback(({ item }: ListRenderItemInfo<T>) => {
    const content = (
      <View style={{
        backgroundColor: t.colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
        padding: t.spacing.lg,
      }}>
        {columns.map((col) => (
          <View key={col.key} style={{ flexDirection: 'row', marginBottom: t.spacing.xs }}>
            <Text style={{
              flex: 1,
              fontSize: t.typography.size.xs,
              color: t.colors.fgMuted,
              fontFamily: t.typography.fontFamily,
              fontWeight: t.typography.weight.medium as TextStyle['fontWeight'],
            }}>
              {col.title}
            </Text>
            <View style={{ flex: col.flex ?? 2 }}>
              {col.render(item)}
            </View>
          </View>
        ))}
      </View>
    );

    if (onPress) {
      return (
        <Pressable onPress={() => onPress(item)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          {content}
        </Pressable>
      );
    }

    return content;
  }, [columns, onPress, t]);

  return (
    <FlatList
      data={data as T[]}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={header as React.ComponentType | null}
      ListEmptyComponent={
        <EmptyState
          title={emptyTitle ?? 'No items'}
          message={emptyMessage}
        />
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.brand} />
        ) : undefined
      }
      style={style}
      contentContainerStyle={data.length === 0 ? { flex: 1 } : undefined}
    />
  );
}
