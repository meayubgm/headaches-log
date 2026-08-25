import { Pressable, Text, View } from 'react-native';

import { PAIN_LEVEL_LABELS, PAIN_LEVELS, type PainLevel } from '@/constants/pain-levels';

import { PainFaceIcon } from './pain-face-icon';

export type PainLevelSelectorProps = {
  value: PainLevel | null;
  onSelect: (level: PainLevel) => void;
};

/** 痛み度合いの選択。タップは選択のみで、保存は「記録する」ボタンで行う */
export function PainLevelSelector({ value, onSelect }: PainLevelSelectorProps) {
  return (
    <View className="flex-row gap-two">
      {PAIN_LEVELS.map((level) => {
        const selected = value === level;

        return (
          <Pressable
            key={level}
            onPress={() => onSelect(level)}
            accessibilityRole="button"
            accessibilityLabel={`痛みの度合い ${level}: ${PAIN_LEVEL_LABELS[level]}`}
            accessibilityState={{ selected }}
            className={[
              'flex-1 items-center gap-two rounded-2xl border-2 py-three',
              selected
                ? 'border-accent bg-surface-selected dark:border-accent-dark dark:bg-surface-selected-dark'
                : 'border-transparent bg-surface dark:bg-surface-dark',
            ].join(' ')}>
            <PainFaceIcon level={level} size={44} />
            <Text
              className={[
                'text-center text-xs',
                selected
                  ? 'font-bold text-fg dark:text-fg-dark'
                  : 'text-fg-muted dark:text-fg-muted-dark',
              ].join(' ')}>
              {PAIN_LEVEL_LABELS[level]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
