import { FontAwesome6 } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { TagNameDialog } from '@/components/tag-name-dialog';
import { ToastBanner } from '@/components/toast-banner';
import { tagTypeName, type TagType } from '@/constants/tag-types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTags } from '@/hooks/use-tags';
import {
  countHeadachesUsingTag,
  createTag,
  renameTag,
  softDeleteTag,
} from '@/lib/db/repositories/tags';
import type { TagRecord } from '@/lib/db/repositories/types';
import { formatError } from '@/lib/format-error';
import { t } from '@/lib/i18n';

/** 開いているダイアログ。名前入力（追加／リネーム）と削除確認は排他 */
type DialogState =
  | { kind: 'none' }
  | { kind: 'add'; type: TagType }
  | { kind: 'rename'; tag: TagRecord }
  | { kind: 'delete'; tag: TagRecord; usageCount: number };

export default function TagSettingsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  const tagsState = useTags();
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  const showToast = (message: string) => {
    setToast((prev) => ({ id: (prev?.id ?? 0) + 1, message }));
  };

  const closeDialog = () => setDialog({ kind: 'none' });

  // 使用中かどうかで文言を変えるため、確認ダイアログを開く前に件数を数える
  const startDelete = async (tag: TagRecord) => {
    setActionError(null);

    try {
      const usageCount = await countHeadachesUsingTag(tag.id);
      setDialog({ kind: 'delete', tag, usageCount });
    } catch (error) {
      setActionError(formatError(error));
    }
  };

  const handleDelete = async (tag: TagRecord) => {
    closeDialog();
    setActionError(null);

    try {
      await softDeleteTag(tag.id);
      showToast(t('tags.deleted'));
    } catch (error) {
      setActionError(formatError(error));
    }
  };

  if (tagsState.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-bg dark:bg-bg-dark">
        <ActivityIndicator />
      </View>
    );
  }

  if (tagsState.status === 'error') {
    return (
      <View className="flex-1 bg-bg p-four dark:bg-bg-dark">
        <Text className="text-sm text-danger dark:text-danger-dark">
          {t('errors.loadFailed', { message: formatError(tagsState.error) })}
        </Text>
      </View>
    );
  }

  const section = (type: TagType) => {
    const tags = tagsState.data.filter((tag) => tag.type === type);
    const title = type === 'cause' ? t('tags.causeTitle') : t('tags.medicationTitle');
    const empty = type === 'cause' ? t('tags.emptyCause') : t('tags.emptyMedication');

    return (
      <View className="gap-two">
        <Text className="text-sm font-bold text-fg-muted dark:text-fg-muted-dark">{title}</Text>

        <View className="gap-one rounded-2xl bg-surface p-two dark:bg-surface-dark">
          {tags.length === 0 && (
            <Text className="p-three text-sm text-fg-muted dark:text-fg-muted-dark">{empty}</Text>
          )}

          {tags.map((tag) => (
            <View key={tag.id} className="flex-row items-center gap-two">
              <Pressable
                onPress={() => setDialog({ kind: 'rename', tag })}
                accessibilityRole="button"
                accessibilityLabel={t('tags.renameA11y', { name: tag.name })}
                className="min-h-[44px] flex-1 justify-center rounded-xl px-three">
                <Text className="text-base text-fg dark:text-fg-dark">{tag.name}</Text>
              </Pressable>
              <Pressable
                onPress={() => startDelete(tag)}
                accessibilityRole="button"
                accessibilityLabel={t('tags.deleteA11y', { name: tag.name })}
                className="min-h-[44px] w-[44px] items-center justify-center rounded-xl">
                <FontAwesome6 name="trash-can" solid size={16} color={colors.danger} />
              </Pressable>
            </View>
          ))}

          <Pressable
            onPress={() => setDialog({ kind: 'add', type })}
            accessibilityRole="button"
            accessibilityLabel={t('tags.addA11y', { type: tagTypeName(type) })}
            className="min-h-[44px] justify-center rounded-xl px-three">
            <Text className="text-base text-primary dark:text-primary-dark">{t('tags.add')}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <SafeAreaView className="flex-1" edges={['bottom', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="w-full max-w-[800px] self-center gap-four p-four">
          {section('cause')}
          {section('medication')}

          <ToastBanner toast={toast} onDismiss={dismissToast} />

          {actionError !== null && (
            <Text className="text-sm text-danger dark:text-danger-dark">{actionError}</Text>
          )}
        </ScrollView>
      </SafeAreaView>

      {dialog.kind === 'add' && (
        <TagNameDialog
          title={t('tags.addTitle')}
          onSubmit={async (name) => {
            await createTag({ name, type: dialog.type });
            showToast(t('tags.saved'));
          }}
          onClose={closeDialog}
        />
      )}

      {dialog.kind === 'rename' && (
        <TagNameDialog
          title={t('tags.renameTitle')}
          initialName={dialog.tag.name}
          onSubmit={async (name) => {
            await renameTag(dialog.tag.id, name);
            showToast(t('tags.saved'));
          }}
          onClose={closeDialog}
        />
      )}

      {dialog.kind === 'delete' && (
        <ConfirmDialog
          visible
          title={t('tags.deleteConfirmTitle')}
          message={
            dialog.usageCount > 0
              ? t('tags.deleteInUseMessage', { count: dialog.usageCount })
              : t('tags.deleteConfirmMessage')
          }
          confirmLabel={t('tags.deleteConfirmLabel')}
          destructive
          onConfirm={() => handleDelete(dialog.tag)}
          onCancel={closeDialog}
        />
      )}
    </View>
  );
}
