import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { HeadacheDetailForm } from '@/components/headache-detail-form';
import { PainLevelSelector } from '@/components/pain-level-selector';
import { ToastBanner } from '@/components/toast-banner';
import type { PainLevel } from '@/constants/pain-levels';
import { useHeadache } from '@/hooks/use-headache';
import { useHeadacheTypes } from '@/hooks/use-headache-types';
import { useTagSelection } from '@/hooks/use-tag-selection';
import { useTags } from '@/hooks/use-tags';
import { softDeleteHeadache, updateHeadache } from '@/lib/db/repositories/headaches';
import type {
  HeadacheRecord,
  HeadacheType,
  HeadacheTypeId,
  TagRecord,
} from '@/lib/db/repositories/types';
import { formatError } from '@/lib/format-error';
import { t } from '@/lib/i18n';

type FormState = {
  painLevel: PainLevel;
  typeIds: HeadacheTypeId[];
  occurredAt: Date;
  memo: string;
};

function toFormState(record: HeadacheRecord): FormState {
  return {
    painLevel: record.painLevel,
    typeIds: record.typeIds,
    occurredAt: new Date(record.occurredAt),
    memo: record.memo ?? '',
  };
}

/** 選択の集合としての比較。並び順の違いは変更とみなさない */
function isSameIds<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

function isDirty(record: HeadacheRecord, form: FormState, selectedTagIds: string[]): boolean {
  return (
    form.painLevel !== record.painLevel ||
    form.occurredAt.toISOString() !== record.occurredAt ||
    form.memo.trim() !== (record.memo ?? '') ||
    !isSameIds(form.typeIds, record.typeIds) ||
    !isSameIds(selectedTagIds, record.tagIds)
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-bg p-four dark:bg-bg-dark">
      <Text className="text-sm text-fg-muted dark:text-fg-muted-dark">{children}</Text>
    </View>
  );
}

/**
 * 編集フォーム本体。`record` を初期値として useState に取り込むため、
 * 呼び出し側は `key={record.id}` を付けて記録が変わったらマウントし直す
 * （useEffect での再同期は cascading render になるため使わない）。
 */
function HeadacheEditor({
  record,
  types,
  tags,
}: {
  record: HeadacheRecord;
  types: HeadacheType[];
  tags: TagRecord[];
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(record));
  const { selectedTagIds, toggleTag, createAndSelectTag } = useTagSelection(record.tagIds);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  const toggleType = (typeId: HeadacheTypeId) => {
    setForm((current) => ({
      ...current,
      typeIds: current.typeIds.includes(typeId)
        ? current.typeIds.filter((value) => value !== typeId)
        : [...current.typeIds, typeId],
    }));
  };

  const handleSave = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    setActionError(null);

    try {
      await updateHeadache(record.id, {
        painLevel: form.painLevel,
        occurredAt: form.occurredAt.toISOString(),
        memo: form.memo.trim() === '' ? null : form.memo.trim(),
        typeIds: form.typeIds,
        tagIds: selectedTagIds,
      });

      setToast((prev) => ({ id: (prev?.id ?? 0) + 1, message: t('editor.updated') }));
    } catch (error) {
      setActionError(formatError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmingDelete(false);
    setActionError(null);

    try {
      await softDeleteHeadache(record.id);

      // Web で詳細URLを直接開いた場合は戻り先の履歴がなく back() が効かないため、
      // カレンダーへ置き換えて「記録が見つかりません」に取り残されないようにする
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/calendar');
      }
    } catch (error) {
      setActionError(formatError(error));
    }
  };

  const saveDisabled = !isDirty(record, form, selectedTagIds) || saving;

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <SafeAreaView className="flex-1" edges={['bottom', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="w-full max-w-[800px] self-center gap-four p-four">
          <View className="gap-three">
            <Text className="text-base font-bold text-fg dark:text-fg-dark">
              {t('editor.painLevelTitle')}
            </Text>
            <PainLevelSelector
              value={form.painLevel}
              onSelect={(painLevel) => setForm((current) => ({ ...current, painLevel }))}
            />
          </View>

          <HeadacheDetailForm
            types={types}
            selectedTypeIds={form.typeIds}
            onToggleType={toggleType}
            occurredAt={form.occurredAt}
            onChangeOccurredAt={(occurredAt) => setForm((current) => ({ ...current, occurredAt }))}
            memo={form.memo}
            onChangeMemo={(memo) => setForm((current) => ({ ...current, memo }))}
            tags={tags}
            selectedTagIds={selectedTagIds}
            onToggleTag={toggleTag}
            onCreateTag={createAndSelectTag}
          />

          <Pressable
            onPress={handleSave}
            disabled={saveDisabled}
            accessibilityRole="button"
            accessibilityLabel={t('editor.update')}
            accessibilityState={{ disabled: saveDisabled }}
            className={[
              'min-h-[52px] items-center justify-center rounded-xl',
              saveDisabled ? 'bg-surface dark:bg-surface-dark' : 'bg-primary dark:bg-primary-dark',
            ].join(' ')}>
            <Text
              className={[
                'text-base font-bold',
                saveDisabled
                  ? 'text-fg-muted dark:text-fg-muted-dark'
                  : 'text-white dark:text-black',
              ].join(' ')}>
              {t('editor.update')}
            </Text>
          </Pressable>

          <ToastBanner toast={toast} onDismiss={dismissToast} />

          {actionError !== null && (
            <Text className="text-sm text-danger dark:text-danger-dark">{actionError}</Text>
          )}

          <Pressable
            onPress={() => setConfirmingDelete(true)}
            accessibilityRole="button"
            accessibilityLabel={t('editor.deleteA11y')}
            className="min-h-[44px] items-center justify-center rounded-xl">
            <Text className="text-base text-danger dark:text-danger-dark">
              {t('editor.delete')}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <ConfirmDialog
        visible={confirmingDelete}
        title={t('editor.deleteConfirmTitle')}
        message={t('editor.deleteConfirmMessage')}
        confirmLabel={t('editor.deleteConfirmLabel')}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </View>
  );
}

export default function HeadacheDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const recordState = useHeadache(id);
  const typesState = useHeadacheTypes();
  const tagsState = useTags();

  if (recordState.status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-bg dark:bg-bg-dark">
        <ActivityIndicator />
      </View>
    );
  }

  if (recordState.status === 'error') {
    return (
      <Message>{t('errors.loadFailed', { message: formatError(recordState.error) })}</Message>
    );
  }

  if (recordState.data === null) {
    return <Message>{t('editor.notFound')}</Message>;
  }

  return (
    <HeadacheEditor
      key={recordState.data.id}
      record={recordState.data}
      types={typesState.status === 'ready' ? typesState.data : []}
      tags={tagsState.status === 'ready' ? tagsState.data : []}
    />
  );
}
