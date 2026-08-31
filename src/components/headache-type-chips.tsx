import { Pressable, Text, View } from 'react-native';

import { headacheTypeName } from '@/constants/headache-types';
import type { HeadacheType, HeadacheTypeId } from '@/lib/db/repositories/types';
import { t } from '@/lib/i18n';

export type HeadacheTypeChipsProps = {
  types: HeadacheType[];
  selectedIds: HeadacheTypeId[];
  onToggle: (id: HeadacheTypeId) => void;
};

/** 頭痛の種類の複数選択チップ */
export function HeadacheTypeChips({ types, selectedIds, onToggle }: HeadacheTypeChipsProps) {
  return (
    <View className="flex-row flex-wrap gap-two">
      {types.map((type) => {
        const selected = selectedIds.includes(type.id);
        const name = headacheTypeName(type.code);

        return (
          <Pressable
            key={type.id}
            onPress={() => onToggle(type.id)}
            accessibilityRole="button"
            accessibilityLabel={t('detailForm.typeChipA11y', { name })}
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
              {name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
