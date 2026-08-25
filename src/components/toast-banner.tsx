import { useEffect } from 'react';
import { Text, View } from 'react-native';

export type Toast = {
  /** 同じ文言を連続表示したときにもタイマーを開始し直すための連番 */
  id: number;
  message: string;
};

export type ToastBannerProps = {
  toast: Toast | null;
  onDismiss: () => void;
  durationMs?: number;
};

/** 保存完了などの短いフィードバック。指定時間後に自動で消える */
export function ToastBanner({ toast, onDismiss, durationMs = 3000 }: ToastBannerProps) {
  const toastId = toast?.id ?? null;

  useEffect(() => {
    if (toastId === null) {
      return;
    }

    const timer = setTimeout(onDismiss, durationMs);

    return () => clearTimeout(timer);
  }, [toastId, durationMs, onDismiss]);

  if (!toast) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      className="rounded-xl bg-accent px-four py-three dark:bg-accent-dark">
      <Text className="text-center text-sm font-bold text-white dark:text-black">
        {toast.message}
      </Text>
    </View>
  );
}
