import { Text, View } from 'react-native';

import { PAIN_LEVEL_LABELS } from '@/constants/pain-levels';
import type { HeadacheRecord, HeadacheType } from '@/lib/db/repositories/types';
import { formatShortDateTime } from '@/lib/format-date';

import { PainFaceIcon } from './pain-face-icon';

export type RecentHeadacheListProps = {
  records: HeadacheRecord[];
  types: HeadacheType[];
};

export function RecentHeadacheList({ records, types }: RecentHeadacheListProps) {
  if (records.length === 0) {
    return (
      <View className="rounded-2xl bg-surface p-four dark:bg-surface-dark">
        <Text className="text-sm text-fg-muted dark:text-fg-muted-dark">
          まだ記録がありません。痛みの度合いを選んで記録してみましょう。
        </Text>
      </View>
    );
  }

  const typeNameById = new Map(types.map((type) => [type.id, type.name]));

  return (
    <View className="overflow-hidden rounded-2xl bg-surface dark:bg-surface-dark">
      {records.map((record, index) => {
        const typeNames = record.typeIds
          .map((id) => typeNameById.get(id))
          .filter((name): name is string => Boolean(name));

        return (
          <View
            key={record.id}
            className={[
              'flex-row items-center gap-three p-three',
              index > 0 ? 'border-t border-surface-selected dark:border-surface-selected-dark' : '',
            ].join(' ')}>
            <PainFaceIcon level={record.painLevel} size={32} />
            <View className="flex-1 gap-half">
              <Text className="text-base text-fg dark:text-fg-dark">
                {formatShortDateTime(new Date(record.occurredAt))}
                <Text className="text-fg-muted dark:text-fg-muted-dark">
                  {`　${PAIN_LEVEL_LABELS[record.painLevel]}`}
                </Text>
              </Text>
              {typeNames.length > 0 && (
                <Text className="text-sm text-fg-muted dark:text-fg-muted-dark">
                  {typeNames.join('・')}
                </Text>
              )}
              {record.memo ? (
                <Text
                  numberOfLines={1}
                  className="text-sm text-fg-muted dark:text-fg-muted-dark">
                  {record.memo}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
