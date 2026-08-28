import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeadacheList } from '@/components/headache-list';
import { MonthCalendar } from '@/components/month-calendar';
import { useHeadacheTypes } from '@/hooks/use-headache-types';
import { useHeadachesInRange } from '@/hooks/use-headaches-in-range';
import { buildMonthGrid, getGridRange, startOfMonth, summarizeByDay } from '@/lib/calendar';
import { formatDateKey, formatFullDate, parseDateKey } from '@/lib/format-date';
import { formatError } from '@/lib/format-error';
import { useTodayKey } from '@/lib/today';

export default function CalendarScreen() {
  // 日付をまたいだら「次の月へ」の活性と当日の強調が追従するよう、
  // マウント時に固定せず useTodayKey()（深夜0時のタイマー＋復帰時に更新）から求める。
  const todayKey = useTodayKey();
  const today = parseDateKey(todayKey);
  const currentMonth = startOfMonth(today.getFullYear(), today.getMonth());

  const [visibleMonth, setVisibleMonth] = useState(currentMonth);
  // 選択日は初期値だけ「今日」。日付をまたいでもユーザーの選択は動かさない
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const typesState = useHeadacheTypes();
  const types = typesState.status === 'ready' ? typesState.data : [];

  const { fromIso, toIso } = useMemo(
    () => getGridRange(buildMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth())),
    [visibleMonth],
  );

  const rangeState = useHeadachesInRange(fromIso, toIso);
  const records = useMemo(
    () => (rangeState.status === 'ready' ? rangeState.data : []),
    [rangeState],
  );

  const summaries = useMemo(() => summarizeByDay(records), [records]);
  const selectedRecords = useMemo(
    () => records.filter((record) => formatDateKey(new Date(record.occurredAt)) === selectedDateKey),
    [records, selectedDateKey],
  );

  // loading と「本当に記録がない」を混同させない
  const emptyListMessage = {
    loading: '読み込み中…',
    error: '読み込みに失敗したため表示できません。',
    ready: 'この日の記録はありません。',
  }[rangeState.status];

  const changeMonth = (delta: -1 | 1) => {
    const next = startOfMonth(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta);
    setVisibleMonth(next);

    // 選択日が移動先の月に含まれないときは、その月の1日へ寄せる
    const selected = parseDateKey(selectedDateKey);
    if (selected.getFullYear() !== next.getFullYear() || selected.getMonth() !== next.getMonth()) {
      setSelectedDateKey(formatDateKey(next));
    }
  };

  const selectDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);

    // 前後の月のセルをタップしたら、その月へ表示を移す
    const selected = parseDateKey(dateKey);
    if (
      selected.getFullYear() !== visibleMonth.getFullYear() ||
      selected.getMonth() !== visibleMonth.getMonth()
    ) {
      setVisibleMonth(startOfMonth(selected.getFullYear(), selected.getMonth()));
    }
  };

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="w-full max-w-[800px] self-center gap-four p-four">
          <Text className="text-2xl font-bold text-fg dark:text-fg-dark">カレンダー</Text>

          {/* 読み込みに失敗するとドットが1つも出ないため、「記録なし」と誤読されないよう
              グリッドより先にエラーを出す */}
          {rangeState.status === 'error' && (
            <Text className="text-sm text-danger dark:text-danger-dark">
              {`記録の読み込みに失敗しました: ${formatError(rangeState.error)}`}
            </Text>
          )}

          <MonthCalendar
            visibleMonth={visibleMonth}
            summaries={summaries}
            selectedDateKey={selectedDateKey}
            onSelectDate={selectDate}
            onChangeMonth={changeMonth}
            maxMonth={currentMonth}
          />

          <View className="gap-three">
            <Text className="text-base font-bold text-fg dark:text-fg-dark">
              {formatFullDate(parseDateKey(selectedDateKey))}
            </Text>

            {/* 発生時刻の上限が「いま」なので、未来日には追加導線を出さない
                （日付キーは YYYY-MM-DD なので辞書順比較がそのまま日付順になる） */}
            {selectedDateKey <= todayKey && (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/headaches/new', params: { date: selectedDateKey } })
                }
                accessibilityRole="button"
                accessibilityLabel={`${formatFullDate(parseDateKey(selectedDateKey))}に記録を追加する`}
                className="min-h-[44px] items-center justify-center rounded-xl bg-surface-selected dark:bg-surface-selected-dark">
                <Text className="text-sm font-bold text-fg dark:text-fg-dark">
                  ＋ この日に記録を追加
                </Text>
              </Pressable>
            )}
            <HeadacheList
              records={selectedRecords}
              types={types}
              timeOnly
              emptyMessage={emptyListMessage}
              onPressRecord={(id) => router.push({ pathname: '/headaches/[id]', params: { id } })}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
