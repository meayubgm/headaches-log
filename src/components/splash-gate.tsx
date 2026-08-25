import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { bootstrapDb } from '@/lib/db/bootstrap';

/**
 * ローカルDBの初期化 → マイグレーション → 端末ローカル user_id の初期化を待ってから
 * 子要素を描画し、スプラッシュを閉じるゲート。
 *
 * ルートレイアウトで SplashScreen.preventAutoHideAsync() を呼んでいるため、
 * hideAsync() を呼ぶのはここだけ。
 */
export function SplashGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    bootstrapDb()
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setFailure(cause);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready || failure) {
      SplashScreen.hideAsync();
    }
  }, [ready, failure]);

  if (failure) {
    return (
      <ScrollView
        className="flex-1 bg-bg dark:bg-bg-dark"
        contentContainerClassName="flex-1 items-center justify-center gap-four p-four">
        <Text className="text-lg font-bold text-fg dark:text-fg-dark">
          データベースの初期化に失敗しました
        </Text>
        <Text className="text-sm text-fg-muted dark:text-fg-muted-dark">
          {failure instanceof Error ? failure.message : String(failure)}
        </Text>
      </ScrollView>
    );
  }

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-bg dark:bg-bg-dark">
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}
