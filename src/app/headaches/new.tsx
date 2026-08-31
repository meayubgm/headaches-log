import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeadacheDetailForm } from '@/components/headache-detail-form';
import { PainLevelSelector } from '@/components/pain-level-selector';
import type { PainLevel } from '@/constants/pain-levels';
import { useHeadacheTypes } from '@/hooks/use-headache-types';
import { useTagSelection } from '@/hooks/use-tag-selection';
import { useTags } from '@/hooks/use-tags';
import { clampToMaximum, floorToMinute } from '@/lib/clamp-date';
import { createHeadache } from '@/lib/db/repositories/headaches';
import type { HeadacheTypeId } from '@/lib/db/repositories/types';
import { formatDateKey, parseDateKey } from '@/lib/format-date';
import { formatError } from '@/lib/format-error';
import { t } from '@/lib/i18n';
import { useTodayKey } from '@/lib/today';

/** 過去日に追加するときの既定時刻（正午。0時始まりよりホイールの移動量が小さい） */
const DEFAULT_HOUR_FOR_PAST_DATE = 12;

/**
 * `YYYY-MM-DD` として厳密に解釈できる日付キーだけを返す（それ以外は null）。
 * `parseDateKey` は `new Date(year, month - 1, day)` なので 2026-02-30 のような
 * 存在しない日を繰り上げてしまう。往復させて元の文字列と一致するかで弾く。
 */
function toValidDateKey(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = parseDateKey(value);
  if (Number.isNaN(parsed.getTime()) || formatDateKey(parsed) !== value) {
    return null;
  }

  return value;
}

/**
 * 選択日の初期発生時刻。今日なら現在時刻（秒は切り捨て）、過去日なら正午。
 * 未来日はカレンダー側で追加導線を出さないが、URL 直叩きに備えて「いま」へ丸める。
 */
function initialOccurredAt(dateKey: string, todayKey: string): Date {
  const now = floorToMinute(new Date());

  if (dateKey === todayKey) {
    return now;
  }

  const date = parseDateKey(dateKey);
  date.setHours(DEFAULT_HOUR_FOR_PAST_DATE, 0, 0, 0);

  return clampToMaximum(date, now);
}

export default function NewHeadacheScreen() {
  const todayKey = useTodayKey();
  const { date } = useLocalSearchParams<{ date?: string }>();

  // 不正な日付キー（URL 直叩きなど）は今日として扱う
  const dateKey = toValidDateKey(date) ?? todayKey;

  const typesState = useHeadacheTypes();
  const types = typesState.status === 'ready' ? typesState.data : [];
  const tagsState = useTags();
  const tags = tagsState.status === 'ready' ? tagsState.data : [];
  const { selectedTagIds, toggleTag, createAndSelectTag } = useTagSelection();

  const [painLevel, setPainLevel] = useState<PainLevel | null>(null);
  const [selectedTypeIds, setSelectedTypeIds] = useState<HeadacheTypeId[]>([]);
  // 初期値は1回だけ求める（レンダーのたびに「いま」が動いて入力中の値を壊さないように）
  const [occurredAt, setOccurredAt] = useState(() => initialOccurredAt(dateKey, todayKey));
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggleType = (id: HeadacheTypeId) => {
    setSelectedTypeIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const saveDisabled = painLevel === null || saving;

  const handleSave = async () => {
    if (painLevel === null || saving) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await createHeadache({
        painLevel,
        occurredAt: occurredAt.toISOString(),
        memo: memo.trim() === '' ? null : memo.trim(),
        typeIds: selectedTypeIds,
        tagIds: selectedTagIds,
      });

      // Web でこの URL を直接開いた場合は戻り先の履歴がないため、カレンダーへ置き換える
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/calendar');
      }
    } catch (error) {
      setSaveError(formatError(error));
      setSaving(false);
    }
  };

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
            <PainLevelSelector value={painLevel} onSelect={setPainLevel} />
          </View>

          <HeadacheDetailForm
            types={types}
            selectedTypeIds={selectedTypeIds}
            onToggleType={toggleType}
            occurredAt={occurredAt}
            onChangeOccurredAt={setOccurredAt}
            memo={memo}
            onChangeMemo={setMemo}
            tags={tags}
            selectedTagIds={selectedTagIds}
            onToggleTag={toggleTag}
            onCreateTag={createAndSelectTag}
          />

          <Pressable
            onPress={handleSave}
            disabled={saveDisabled}
            accessibilityRole="button"
            accessibilityLabel={t('editor.create')}
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
              {t('editor.create')}
            </Text>
          </Pressable>

          {saveError !== null && (
            <Text className="text-sm text-danger dark:text-danger-dark">
              {t('errors.saveFailed', { message: saveError })}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
