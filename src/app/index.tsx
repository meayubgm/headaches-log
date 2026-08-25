import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeadacheDetailForm } from '@/components/headache-detail-form';
import { PainLevelSelector } from '@/components/pain-level-selector';
import { RecentHeadacheList } from '@/components/recent-headache-list';
import { ToastBanner } from '@/components/toast-banner';
import type { PainLevel } from '@/constants/pain-levels';
import { useHeadacheTypes } from '@/hooks/use-headache-types';
import { useRecentHeadaches } from '@/hooks/use-recent-headaches';
import { createHeadache } from '@/lib/db/repositories/headaches';
import type { HeadacheTypeId } from '@/lib/db/repositories/types';
import { formatFullDate } from '@/lib/format-date';

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function HomeScreen() {
  const typesState = useHeadacheTypes();
  const recentState = useRecentHeadaches();

  const [painLevel, setPainLevel] = useState<PainLevel | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTypeIds, setSelectedTypeIds] = useState<HeadacheTypeId[]>([]);
  // 詳細を開いた時点の時刻で固定する（開きっぱなしでも記録時刻が飛ばないように）
  const [occurredAt, setOccurredAt] = useState<Date | null>(null);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const types = typesState.status === 'ready' ? typesState.data : [];
  const records = recentState.status === 'ready' ? recentState.data : [];

  const toggleDetail = () => {
    if (!detailOpen && occurredAt === null) {
      setOccurredAt(new Date());
    }
    setDetailOpen((open) => !open);
  };

  const toggleType = (id: HeadacheTypeId) => {
    setSelectedTypeIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const dismissToast = useCallback(() => setToast(null), []);

  const handleSave = async () => {
    if (painLevel === null || saving) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      // 詳細パネルを閉じてから記録しても入力内容を捨てない（detailOpen では分岐しない）
      await createHeadache({
        painLevel,
        occurredAt: (occurredAt ?? new Date()).toISOString(),
        memo: memo.trim() === '' ? null : memo.trim(),
        typeIds: selectedTypeIds,
      });

      setPainLevel(null);
      setSelectedTypeIds([]);
      setOccurredAt(null);
      setMemo('');
      setDetailOpen(false);
      setToast((prev) => ({ id: (prev?.id ?? 0) + 1, message: '記録しました' }));
    } catch (error) {
      setSaveError(formatError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="w-full max-w-[800px] self-center gap-four p-four">
          <View className="gap-half">
            <Text className="text-2xl font-bold text-fg dark:text-fg-dark">頭痛ログ</Text>
            <Text className="text-sm text-fg-muted dark:text-fg-muted-dark">
              {formatFullDate(new Date())}
            </Text>
          </View>

          <View className="gap-three">
            <Text className="text-base font-bold text-fg dark:text-fg-dark">いまの痛みは？</Text>
            <PainLevelSelector value={painLevel} onSelect={setPainLevel} />
          </View>

          <Pressable
            onPress={toggleDetail}
            accessibilityRole="button"
            accessibilityState={{ expanded: detailOpen }}
            className="min-h-[44px] justify-center rounded-xl bg-surface px-four dark:bg-surface-dark">
            <Text className="text-sm text-fg dark:text-fg-dark">
              {detailOpen ? '詳細を閉じる' : '詳細を入力'}
            </Text>
          </Pressable>

          {detailOpen && (
            <HeadacheDetailForm
              types={types}
              selectedTypeIds={selectedTypeIds}
              onToggleType={toggleType}
              occurredAt={occurredAt ?? new Date()}
              onChangeOccurredAt={setOccurredAt}
              memo={memo}
              onChangeMemo={setMemo}
            />
          )}

          <Pressable
            onPress={handleSave}
            disabled={painLevel === null || saving}
            accessibilityRole="button"
            accessibilityLabel="記録する"
            accessibilityState={{ disabled: painLevel === null || saving }}
            className={[
              'min-h-[52px] items-center justify-center rounded-xl',
              painLevel === null || saving
                ? 'bg-surface dark:bg-surface-dark'
                : 'bg-accent dark:bg-accent-dark',
            ].join(' ')}>
            <Text
              className={[
                'text-base font-bold',
                painLevel === null || saving
                  ? 'text-fg-muted dark:text-fg-muted-dark'
                  : 'text-white dark:text-black',
              ].join(' ')}>
              記録する
            </Text>
          </Pressable>

          <ToastBanner toast={toast} onDismiss={dismissToast} />

          {saveError !== null && (
            <Text className="text-sm text-danger dark:text-danger-dark">
              {`保存に失敗しました: ${saveError}`}
            </Text>
          )}

          <View className="gap-three">
            <Text className="text-base font-bold text-fg dark:text-fg-dark">最近の記録</Text>
            {recentState.status === 'error' ? (
              <Text className="text-sm text-danger dark:text-danger-dark">
                {`記録の読み込みに失敗しました: ${formatError(recentState.error)}`}
              </Text>
            ) : (
              <RecentHeadacheList records={records} types={types} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
