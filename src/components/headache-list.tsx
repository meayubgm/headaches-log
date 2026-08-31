import { Pressable, Text, View } from 'react-native';

import { headacheTypeName } from '@/constants/headache-types';
import { painLevelLabel } from '@/constants/pain-levels';
import type { HeadacheRecord, HeadacheType } from '@/lib/db/repositories/types';
import { formatShortDateTime, formatTime } from '@/lib/format-date';
import { t } from '@/lib/i18n';

import { PainFaceIcon } from './pain-face-icon';

export type HeadacheListProps = {
  records: HeadacheRecord[];
  types: HeadacheType[];
  /** 渡されたときだけ行がタップ可能になる */
  onPressRecord?: (id: string) => void;
  emptyMessage?: string;
  /** 日別一覧のように日付が自明な場面では時刻だけを表示する */
  timeOnly?: boolean;
};

export function HeadacheList({
  records,
  types,
  onPressRecord,
  emptyMessage = t('headacheList.empty'),
  timeOnly = false,
}: HeadacheListProps) {
  if (records.length === 0) {
    return (
      <View className="rounded-2xl bg-surface p-four dark:bg-surface-dark">
        <Text className="text-sm text-fg-muted dark:text-fg-muted-dark">{emptyMessage}</Text>
      </View>
    );
  }

  const typeNameById = new Map(types.map((type) => [type.id, headacheTypeName(type.code)]));

  return (
    <View className="overflow-hidden rounded-2xl bg-surface dark:bg-surface-dark">
      {records.map((record, index) => {
        const typeNames = record.typeIds
          .map((id) => typeNameById.get(id))
          .filter((name): name is string => Boolean(name));

        const occurredAt = new Date(record.occurredAt);
        const timeLabel = timeOnly ? formatTime(occurredAt) : formatShortDateTime(occurredAt);
        const levelLabel = painLevelLabel(record.painLevel);

        const rowClassName = [
          'flex-row items-center gap-three p-three',
          index > 0 ? 'border-t border-surface-selected dark:border-surface-selected-dark' : '',
        ].join(' ');

        const content = (
          <>
            <PainFaceIcon level={record.painLevel} size={32} />
            <View className="flex-1 gap-half">
              <Text className="text-base text-fg dark:text-fg-dark">
                {timeLabel}
                <Text className="text-fg-muted dark:text-fg-muted-dark">
                  {`${t('headacheList.levelSeparator')}${levelLabel}`}
                </Text>
              </Text>
              {typeNames.length > 0 && (
                <Text className="text-sm text-fg-muted dark:text-fg-muted-dark">
                  {typeNames.join(t('headacheList.typeSeparator'))}
                </Text>
              )}
              {record.memo ? (
                <Text numberOfLines={1} className="text-sm text-fg-muted dark:text-fg-muted-dark">
                  {record.memo}
                </Text>
              ) : null}
            </View>
          </>
        );

        if (!onPressRecord) {
          return (
            <View key={record.id} className={rowClassName}>
              {content}
            </View>
          );
        }

        return (
          <Pressable
            key={record.id}
            onPress={() => onPressRecord(record.id)}
            accessibilityRole="button"
            accessibilityLabel={t('headacheList.openRecordA11y', {
              time: timeLabel,
              level: levelLabel,
            })}
            className={`${rowClassName} min-h-[44px]`}>
            {content}
          </Pressable>
        );
      })}
    </View>
  );
}
