import { Modal, Pressable, Text, View } from 'react-native';

/**
 * 確認ダイアログ。react-native の `Alert` は react-native-web で機能しないため、
 * 3プラットフォーム共通で動くよう `Modal` で自前実装している。
 */
export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** 削除など取り消せない操作は確定ボタンを danger 色にする */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'キャンセル',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClassName = destructive
    ? 'bg-danger dark:bg-danger-dark'
    : 'bg-primary dark:bg-primary-dark';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal>
      <View className="flex-1 items-center justify-center bg-black/50 p-four">
        <View className="w-full max-w-[400px] gap-four rounded-2xl bg-bg p-four dark:bg-bg-dark">
          <View className="gap-two">
            <Text className="text-base font-bold text-fg dark:text-fg-dark">{title}</Text>
            {message !== undefined && (
              <Text className="text-sm text-fg-muted dark:text-fg-muted-dark">{message}</Text>
            )}
          </View>

          <View className="flex-row gap-two">
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              className="min-h-[44px] flex-1 items-center justify-center rounded-xl bg-surface dark:bg-surface-dark">
              <Text className="text-base text-fg dark:text-fg-dark">{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              className={`min-h-[44px] flex-1 items-center justify-center rounded-xl ${confirmClassName}`}>
              <Text className="text-base font-bold text-white">{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
