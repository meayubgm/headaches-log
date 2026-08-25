import { Pressable, Text, TextInput, View } from 'react-native';

import type { HeadacheType, HeadacheTypeId } from '@/lib/db/repositories/types';

import { DateTimeField } from './date-time-field';
import { HeadacheTypeChips } from './headache-type-chips';

/** 発生時刻のクイック指定（現在時刻からの遡り分数） */
const TIME_SHORTCUTS: { label: string; minutesAgo: number }[] = [
  { label: 'いま', minutesAgo: 0 },
  { label: '30分前', minutesAgo: 30 },
  { label: '1時間前', minutesAgo: 60 },
  { label: '2時間前', minutesAgo: 120 },
];

export type HeadacheDetailFormProps = {
  types: HeadacheType[];
  selectedTypeIds: HeadacheTypeId[];
  onToggleType: (id: HeadacheTypeId) => void;
  occurredAt: Date;
  onChangeOccurredAt: (next: Date) => void;
  memo: string;
  onChangeMemo: (next: string) => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-two">
      <Text className="text-sm font-bold text-fg-muted dark:text-fg-muted-dark">{title}</Text>
      {children}
    </View>
  );
}

export function HeadacheDetailForm({
  types,
  selectedTypeIds,
  onToggleType,
  occurredAt,
  onChangeOccurredAt,
  memo,
  onChangeMemo,
}: HeadacheDetailFormProps) {
  return (
    <View className="gap-four rounded-2xl bg-surface p-four dark:bg-surface-dark">
      <Section title="頭痛の種類（複数選択可）">
        <HeadacheTypeChips types={types} selectedIds={selectedTypeIds} onToggle={onToggleType} />
      </Section>

      <Section title="発生時刻">
        <DateTimeField value={occurredAt} onChange={onChangeOccurredAt} maximumDate={new Date()} />
        <View className="flex-row flex-wrap gap-two">
          {TIME_SHORTCUTS.map(({ label, minutesAgo }) => (
            <Pressable
              key={label}
              onPress={() => onChangeOccurredAt(new Date(Date.now() - minutesAgo * 60_000))}
              accessibilityRole="button"
              accessibilityLabel={`発生時刻を${label}にする`}
              className="min-h-[44px] justify-center rounded-full bg-surface-selected px-three dark:bg-surface-selected-dark">
              <Text className="text-sm text-fg dark:text-fg-dark">{label}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="メモ">
        <TextInput
          value={memo}
          onChangeText={onChangeMemo}
          placeholder="気づいたことがあれば"
          multiline
          numberOfLines={3}
          accessibilityLabel="メモ"
          className="min-h-[88px] rounded-xl bg-bg p-three text-base text-fg dark:bg-bg-dark dark:text-fg-dark"
          textAlignVertical="top"
        />
      </Section>
    </View>
  );
}
