import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

/** 1行の高さ。中央ハイライト帯（date-time-wheel）と揃える必要がある */
export const ITEM_HEIGHT = 40;
/** 可視行数（中央 ±2） */
export const VISIBLE_COUNT = 5;
/** 選択行を中央に置くための上下パディング */
export const WHEEL_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2);
export const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;

/** スクロール停止とみなすまでの待ち時間 */
const SETTLE_DELAY_MS = 150;
/**
 * 自前で scrollTo した直後に無視するスクロールイベントの猶予。
 * アニメーション中のオフセットを「ユーザーが選び直した」と誤認して
 * 他の列（例: 月を変えた直後の日）を巻き込んで書き換えるのを防ぐ。
 */
const PROGRAMMATIC_SCROLL_GUARD_MS = 400;

export type WheelItem = {
  /** onChange で返す値 */
  value: number;
  text: string;
  disabled?: boolean;
};

export type WheelPickerColumnProps = {
  /** アクセシビリティ用のラベル（例: 月） */
  label: string;
  items: WheelItem[];
  value: number;
  onChange: (next: number) => void;
  /**
   * テンキー入力が確定したときに、入力された数値をそのまま渡す。
   * 月列の value は「年×12＋月」の通し番号で表示上の数値と一致しないため、
   * 入力値の解釈は列ではなく呼び出し側（date-time-wheel）に持たせている。
   */
  onSubmitInput: (typed: number) => void;
  /** テンキーに初期表示する数値（表示上の値。月なら 1〜12） */
  inputValue: number;
  maxLength?: number;
};

/** 無効な位置に止まったときの寄せ先。前後で近いほうの有効なインデックスを返す */
function nearestEnabledIndex(items: WheelItem[], index: number): number {
  if (!items[index]?.disabled) {
    return index;
  }

  for (let distance = 1; distance < items.length; distance += 1) {
    const before = index - distance;
    if (before >= 0 && !items[before].disabled) {
      return before;
    }

    const after = index + distance;
    if (after < items.length && !items[after].disabled) {
      return after;
    }
  }

  return index;
}

/**
 * 縦スクロールのホイール1列。iOS / Android / Web で同じ実装を使う。
 * 中央の行をタップするとテンキー入力に切り替わる。
 */
export function WheelPickerColumn({
  label,
  items,
  value,
  onChange,
  onSubmitInput,
  inputValue,
  maxLength = 2,
}: WheelPickerColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticUntil = useRef(0);
  const lastOffsetY = useRef(0);
  const committed = useRef(false);
  const mounted = useRef(false);
  const prevItemCount = useRef(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const foundIndex = items.findIndex((item) => item.value === value);
  const index = foundIndex >= 0 ? foundIndex : 0;
  const itemCount = items.length;

  /**
   * force は「件数が変わった直後」に使う。件数が変わるとブラウザ（スクロールアンカリング）や
   * OS が勝手にスクロール位置をずらすため、位置が合っていても宣言し直してガードを張る。
   */
  const scrollToIndex = (targetIndex: number, animated: boolean, force = false) => {
    const targetOffsetY = targetIndex * ITEM_HEIGHT;

    // すでにその位置にいるなら scroll イベントは出ない。ここでガードを張ると
    // 直後のユーザー操作（自分で選んだ値を選び直す等）を取りこぼす。
    if (!force && Math.abs(lastOffsetY.current - targetOffsetY) < 1) {
      return;
    }

    lastOffsetY.current = targetOffsetY;
    programmaticUntil.current = Date.now() + PROGRAMMATIC_SCROLL_GUARD_MS;
    scrollRef.current?.scrollTo({ y: targetOffsetY, animated });

    if (force) {
      // 位置の付け替えはレイアウト後に起きるので、次のフレームで宣言し直す
      requestAnimationFrame(() => {
        lastOffsetY.current = targetOffsetY;
        scrollRef.current?.scrollTo({ y: targetOffsetY, animated: false });
      });
    }
  };

  // 外から値が変わったとき（相対時刻ボタン、上限クランプ、他の列による日数変化）に追従する。
  // 件数が変わるとブラウザ側がスクロール位置を詰めるため、itemCount も依存に含める。
  // マウント時は onLayout 側で位置を合わせるためスキップする。
  useEffect(() => {
    const countChanged = prevItemCount.current !== itemCount;
    prevItemCount.current = itemCount;

    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    scrollToIndex(index, true, countChanged);
  }, [index, itemCount]);

  useEffect(() => {
    return () => {
      if (settleTimer.current) {
        clearTimeout(settleTimer.current);
      }
    };
  }, []);

  const settle = (offsetY: number) => {
    // 自前の scrollTo に由来するイベントは無視する（ユーザー操作だけを確定に使う）
    if (Date.now() < programmaticUntil.current) {
      return;
    }

    const raw = Math.min(items.length - 1, Math.max(0, Math.round(offsetY / ITEM_HEIGHT)));
    const target = nearestEnabledIndex(items, raw);

    if (target !== raw) {
      scrollToIndex(target, true);
    }

    const next = items[target];
    if (next && next.value !== value) {
      onChange(next.value);
    }
  };

  /**
   * 確定は onScroll のデバウンスで判定する。onMomentumScrollEnd は
   * Web（react-native-web の CSS scroll-snap）で発火しないため使えない。
   */
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    lastOffsetY.current = offsetY;

    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
    }
    settleTimer.current = setTimeout(() => settle(offsetY), SETTLE_DELAY_MS);
  };

  const startEditing = () => {
    setDraft(String(inputValue));
    committed.current = false;
    setEditing(true);
  };

  /** onSubmitEditing のあと、アンマウントに伴う onBlur でもう一度呼ばれるため1回に絞る */
  const commitEditing = () => {
    if (committed.current) {
      return;
    }
    committed.current = true;
    setEditing(false);

    const typed = Number.parseInt(draft, 10);
    if (Number.isNaN(typed)) {
      return;
    }

    onSubmitInput(typed);
  };

  const handlePressItem = (itemIndex: number) => {
    if (items[itemIndex].disabled) {
      return;
    }

    if (itemIndex === index) {
      startEditing();
      return;
    }

    onChange(items[itemIndex].value);
  };

  return (
    <View className="flex-1" style={{ height: WHEEL_HEIGHT }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onLayout={() => scrollToIndex(index, false)}
        contentContainerStyle={{ paddingVertical: WHEEL_PADDING }}>
        {items.map((item, itemIndex) => (
          <Pressable
            key={item.value}
            onPress={() => handlePressItem(itemIndex)}
            disabled={item.disabled}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${item.text}`}
            accessibilityState={{ selected: itemIndex === index, disabled: item.disabled }}
            style={{ height: ITEM_HEIGHT }}
            className="items-center justify-center">
            <Text
              className={[
                itemIndex === index ? 'text-lg font-bold' : 'text-base',
                item.disabled
                  ? 'text-fg-muted opacity-40 dark:text-fg-muted-dark'
                  : itemIndex === index
                    ? 'text-fg dark:text-fg-dark'
                    : 'text-fg-muted dark:text-fg-muted-dark',
              ].join(' ')}>
              {item.text}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {editing && (
        <View
          className="absolute left-0 right-0 items-center justify-center"
          style={{ top: WHEEL_PADDING, height: ITEM_HEIGHT }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={commitEditing}
            onBlur={commitEditing}
            autoFocus
            selectTextOnFocus
            maxLength={maxLength}
            // iOS の number-pad には確定キーがないため、確定は onBlur が担う
            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
            accessibilityLabel={`${label}を入力`}
            className="h-full w-full rounded-lg bg-bg text-center text-lg font-bold text-fg dark:bg-bg-dark dark:text-fg-dark"
          />
        </View>
      )}
    </View>
  );
}
