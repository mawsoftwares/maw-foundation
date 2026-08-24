import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useNativeTheme } from './theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly variant: ToastVariant;
  readonly duration?: number;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ---------------------------------------------------------------------------
// ToastProvider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, variant: ToastVariant = 'info', duration = 3000) => {
    const id = String(++idRef.current);
    setToasts((prev) => [...prev, { id, message, variant, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const value: ToastContextValue = {
    show,
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    warning: (msg) => show(msg, 'warning'),
    info: (msg) => show(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx === null) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// ToastContainer + ToastItem
// ---------------------------------------------------------------------------

function ToastContainer({ toasts }: { toasts: readonly Toast[] }): ReactNode {
  return (
    <View style={{
      position: 'absolute',
      top: 60,
      left: 16,
      right: 16,
      zIndex: 999,
      gap: 8,
    } as ViewStyle}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

function ToastItem({ toast }: { toast: Toast }): ReactNode {
  const { styles: t } = useNativeTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 200,
    useNativeDriver: true,
  }).start();

  const bgMap: Record<ToastVariant, string> = {
    info: t.colors.info,
    success: t.colors.success,
    warning: t.colors.warning,
    error: t.colors.danger,
  };

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      backgroundColor: bgMap[toast.variant],
      borderRadius: t.radius.md,
      padding: t.spacing.md,
      ...t.shadows.md,
    }}>
      <Text style={{
        color: '#ffffff',
        fontSize: t.typography.size.sm,
        fontWeight: t.typography.weight.medium as TextStyle['fontWeight'],
        fontFamily: t.typography.fontFamily,
      }}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}
