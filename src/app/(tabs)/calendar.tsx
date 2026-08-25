import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeadacheList } from '@/components/headache-list';
import { MonthCalendar } from '@/components/month-calendar';
import { useHeadacheTypes } from '@/hooks/use-headache-types';
import { useHeadachesInRange } from '@/hooks/use-headaches-in-range';
import { buildMonthGrid, getGridRange, startOfMonth, summarizeByDay } from '@/lib/calendar';
import { formatDateKey, formatFullDate } from '@/lib/format-date';
import { formatError } from '@/lib/format-error';

/** 'YYYY-MM-DD' をローカル日付の Date に戻す（new Date(文字列) は UTC 解釈になるため使わない） */
function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function CalendarScreen() {
  // 日付をマウント時に固定すると、アプリを起動したまま月をまたいだときに
  // 「次の月へ」が旧・当月で無効化されたままになるので、毎レンダー現在時刻から求める。
  const currentMonth = startOfMonth(new Date().getFullYear(), new Date().getMonth());

  const [visibleMonth, setVisibleMonth] = useState(currentMonth);
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));

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
