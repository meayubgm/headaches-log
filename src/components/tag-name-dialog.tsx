import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { formatError } from '@/lib/format-error';
import { t } from '@/lib/i18n';

export type TagNameDialogProps = {
  title: string;
  /** リネーム時の初期値。追加時は空 */
  initialName?: string;
  /** 失敗（重複名など）は throw で返す。ダイアログは開いたままエラーを出す */
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
};

/**
 * タグ名の入力ダイアログ。追加とリネームの両方で使う。
 *
 * 呼び出し側が `{open && <TagNameDialog … />}` の形で出し入れする前提で、
 * 開くたびに入力値とエラーが初期化される（Modal の visible では state が残るため）。
 * `Alert.prompt` は iOS 専用で Web / Android では動かないので Modal で自前実装している。
 */
export function TagNameDialog({ title, initialName = '', onSubmit, onClose }: TagNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const submitDisabled = trimmed === '' || submitting;

  const handleSubmit = async () => {
    if (submitDisabled) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(trimmed);
      onClose();
    } catch (submitError) {
      setError(formatError(submitError));
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal>
      <View className="flex-1 items-center justify-center bg-black/50 p-four">
        <View className="w-full max-w-[400px] gap-four rounded-2xl bg-bg p-four dark:bg-bg-dark">
          <Text className="text-base font-bold text-fg dark:text-fg-dark">{title}</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('tags.namePlaceholder')}
            accessibilityLabel={t('tags.namePlaceholder')}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            className="min-h-[44px] rounded-xl bg-surface px-three text-base text-fg dark:bg-surface-dark dark:text-fg-dark"
          />

          {error !== null && (
            <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
          )}

          <View className="flex-row gap-two">
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('confirmDialog.cancel')}
              className="min-h-[44px] flex-1 items-center justify-center rounded-xl bg-surface dark:bg-surface-dark">
              <Text className="text-base text-fg dark:text-fg-dark">
                {t('confirmDialog.cancel')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={submitDisabled}
              accessibilityRole="button"
              accessibilityLabel={t('tags.save')}
              accessibilityState={{ disabled: submitDisabled }}
              className={[
                'min-h-[44px] flex-1 items-center justify-center rounded-xl',
                submitDisabled
                  ? 'bg-surface dark:bg-surface-dark'
                  : 'bg-primary dark:bg-primary-dark',
              ].join(' ')}>
              <Text
                className={[
                  'text-base font-bold',
                  submitDisabled
                    ? 'text-fg-muted dark:text-fg-muted-dark'
                    : 'text-white dark:text-black',
                ].join(' ')}>
                {t('tags.save')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
