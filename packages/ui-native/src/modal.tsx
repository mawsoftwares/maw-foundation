import { type ReactNode } from 'react';
import {
  Modal as RNModal,
  Pressable,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useNativeTheme } from './theme';
import { Button } from './components';

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export interface ModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  readonly style?: ViewStyle;
}

export function Modal({ visible, onClose, title, children, style }: ModalProps): ReactNode {
  const { styles: t } = useNativeTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: t.colors.overlay,
          justifyContent: 'center',
          padding: t.spacing.xl,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: t.colors.bg,
            borderRadius: t.radius.lg,
            padding: t.spacing.xl,
            ...t.shadows.lg,
            ...(style as object),
          }}
          onPress={() => {}}
        >
          {title != null && (
            <Text style={{
              fontSize: t.typography.size.lg,
              fontWeight: t.typography.weight.semibold as TextStyle['fontWeight'],
              color: t.colors.fg,
              fontFamily: t.typography.fontFamily,
              marginBottom: t.spacing.lg,
            }}>
              {title}
            </Text>
          )}
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

export interface DialogProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly message?: string;
  readonly children?: ReactNode;
}

export function Dialog({ visible, onClose, title, message, children }: DialogProps): ReactNode {
  const { styles: t } = useNativeTheme();

  return (
    <Modal visible={visible} onClose={onClose} title={title}>
      {message != null && (
        <Text style={{
          fontSize: t.typography.size.md,
          color: t.colors.fgMuted,
          fontFamily: t.typography.fontFamily,
          marginBottom: t.spacing.lg,
        }}>
          {message}
        </Text>
      )}
      {children}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// ConfirmationDialog
// ---------------------------------------------------------------------------

export interface ConfirmationDialogProps {
  readonly visible: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly title: string;
  readonly message?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly variant?: 'primary' | 'danger';
}

export function ConfirmationDialog({
  visible,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
}: ConfirmationDialogProps): ReactNode {
  const { styles: t } = useNativeTheme();

  return (
    <Dialog visible={visible} onClose={onCancel} title={title} message={message}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: t.spacing.sm }}>
        <Button variant="ghost" title={cancelLabel} onPress={onCancel} />
        <Button variant={variant} title={confirmLabel} onPress={onConfirm} />
      </View>
    </Dialog>
  );
}
