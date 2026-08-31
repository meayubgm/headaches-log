import { Pressable, Text, TextInput, View } from 'react-native';

import type { TagType } from '@/constants/tag-types';
import { floorToMinute } from '@/lib/clamp-date';
import type { HeadacheType, HeadacheTypeId, TagRecord } from '@/lib/db/repositories/types';
import { t } from '@/lib/i18n';

import { DateTimeField } from './date-time-field';
import { HeadacheTypeChips } from './headache-type-chips';
import { TagChips } from './tag-chips';

/**
 * 発生時刻のクイック指定。minutesAgo が null なら現在時刻へ、
 * 数値なら**いま入力されている時刻から**その分だけ遡る（連打で刻める）。
 */
const TIME_SHORTCUTS: { minutesAgo: number | null }[] = [
  { minutesAgo: null },
  { minutesAgo: 30 },
  { minutesAgo: 60 },
];

/** ちょうど時間単位なら「1時間前」、それ以外は「30分前」の形にする */
function shortcutLabel(minutesAgo: number | null): string {
  if (minutesAgo === null) {
    return t('detailForm.shortcutNow');
  }

  if (minutesAgo % 60 === 0) {
    return t('detailForm.shortcutHoursAgo', { hours: minutesAgo / 60 });
  }

  return t('detailForm.shortcutMinutesAgo', { minutes: minutesAgo });
}

export type HeadacheDetailFormProps = {
  types: HeadacheType[];
  selectedTypeIds: HeadacheTypeId[];
  onToggleType: (id: HeadacheTypeId) => void;
  occurredAt: Date;
  onChangeOccurredAt: (next: Date) => void;
  memo: string;
  onChangeMemo: (next: string) => void;
  /** 生存タグ全件。区分ごとの振り分けはこのコンポーネントが行う */
  tags: TagRecord[];
  selectedTagIds: string[];
  onToggleTag: (id: string) => void;
  onCreateTag: (name: string, type: TagType) => Promise<void>;
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
  tags,
  selectedTagIds,
  onToggleTag,
  onCreateTag,
}: HeadacheDetailFormProps) {
  const causeTags = tags.filter((tag) => tag.type === 'cause');
  const medicationTags = tags.filter((tag) => tag.type === 'medication');

  return (
    <View className="gap-four rounded-2xl bg-surface p-four dark:bg-surface-dark">
      <Section title={t('detailForm.typesTitle')}>
        <HeadacheTypeChips types={types} selectedIds={selectedTypeIds} onToggle={onToggleType} />
      </Section>

      <Section title={t('detailForm.causeTagsTitle')}>
        <TagChips
          tags={causeTags}
          type="cause"
          selectedIds={selectedTagIds}
          onToggle={onToggleTag}
          onCreate={onCreateTag}
        />
      </Section>

      <Section title={t('detailForm.medicationTagsTitle')}>
        <TagChips
          tags={medicationTags}
          type="medication"
          selectedIds={selectedTagIds}
          onToggle={onToggleTag}
          onCreate={onCreateTag}
        />
      </Section>

      <Section title={t('detailForm.occurredAtTitle')}>
        <DateTimeField
          value={occurredAt}
          onChange={onChangeOccurredAt}
          getMaximumDate={() => new Date()}
        />
        <View className="flex-row flex-wrap gap-two">
          {TIME_SHORTCUTS.map(({ minutesAgo }) => {
            const label = shortcutLabel(minutesAgo);

            return (
              <Pressable
                key={String(minutesAgo)}
                onPress={() =>
                  onChangeOccurredAt(
                    floorToMinute(
                      minutesAgo === null
                        ? new Date()
                        : new Date(occurredAt.getTime() - minutesAgo * 60_000),
                    ),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={
                  minutesAgo === null
                    ? t('detailForm.shortcutNowA11y')
                    : t('detailForm.shortcutShiftA11y', { label })
                }
                className="min-h-[44px] justify-center rounded-full bg-surface-selected px-three dark:bg-surface-selected-dark">
                <Text className="text-sm text-fg dark:text-fg-dark">{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title={t('detailForm.memoTitle')}>
        <TextInput
          value={memo}
          onChangeText={onChangeMemo}
          placeholder={t('detailForm.memoPlaceholder')}
          multiline
          numberOfLines={3}
          accessibilityLabel={t('detailForm.memoTitle')}
          className="min-h-[88px] rounded-xl bg-bg p-three text-base text-fg dark:bg-bg-dark dark:text-fg-dark"
          textAlignVertical="top"
        />
      </Section>
    </View>
  );
}
