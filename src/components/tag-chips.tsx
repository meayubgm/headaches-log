import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { tagTypeName, type TagType } from '@/constants/tag-types';
import type { TagRecord } from '@/lib/db/repositories/types';
import { t } from '@/lib/i18n';

import { TagNameDialog } from './tag-name-dialog';

export type TagChipsProps = {
  tags: TagRecord[];
  type: TagType;
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** その場でタグを作る。作成後は呼び出し側で選択済みにする */
  onCreate: (name: string, type: TagType) => Promise<void>;
};

/**
 * タグの複数選択チップ。末尾の「＋ 追加」からその場で新規作成できるので、
 * タグが1つも無い状態でも記録を中断してタグ管理画面へ行かずに済む。
 */
export function TagChips({ tags, type, selectedIds, onToggle, onCreate }: TagChipsProps) {
  const [adding, setAdding] = useState(false);

  return (
    <View className="flex-row flex-wrap gap-two">
      {tags.map((tag) => {
        const selected = selectedIds.includes(tag.id);

        return (
          <Pressable
            key={tag.id}
            onPress={() => onToggle(tag.id)}
            accessibilityRole="button"
            accessibilityLabel={t('detailForm.tagChipA11y', { name: tag.name })}
            accessibilityState={{ selected }}
            className={[
              'min-h-[44px] justify-center rounded-full border px-four',
              selected
                ? 'border-primary bg-primary dark:border-primary-dark dark:bg-primary-dark'
                : 'border-surface-selected bg-bg dark:border-surface-selected-dark dark:bg-bg-dark',
            ].join(' ')}>
            <Text
              className={[
                'text-sm',
                selected ? 'font-bold text-white dark:text-black' : 'text-fg dark:text-fg-dark',
              ].join(' ')}>
              {tag.name}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={() => setAdding(true)}
        accessibilityRole="button"
        accessibilityLabel={t('detailForm.addTagA11y', { type: tagTypeName(type) })}
        className="min-h-[44px] justify-center rounded-full bg-surface-selected px-three dark:bg-surface-selected-dark">
        <Text className="text-sm text-fg dark:text-fg-dark">{t('detailForm.addTag')}</Text>
      </Pressable>

      {adding && (
        <TagNameDialog
          title={t('tags.addTitle')}
          onSubmit={(name) => onCreate(name, type)}
          onClose={() => setAdding(false)}
        />
      )}
    </View>
  );
}
