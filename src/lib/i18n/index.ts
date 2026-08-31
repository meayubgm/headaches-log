import { getLocales } from 'expo-localization';
import { I18n, type TranslateOptions } from 'i18n-js';

import { en } from './locales/en';
import { ja, type Translations } from './locales/ja';

/** 対応言語。端末の言語がここに無ければ英語で表示する */
export const SUPPORTED_LOCALES = ['ja', 'en'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * 辞書のネストをドット区切りのキーに畳んだ型。
 * `t('calendar.title')` のようなキーの打ち間違いをコンパイル時に弾く。
 */
type LeafKeys<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${LeafKeys<T[K]>}`;
}[keyof T & string];

export type TranslationKey = LeafKeys<Translations>;

function isAppLocale(value: string | null | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.some((supported) => supported === value);
}

/**
 * 端末の言語。初回リリースでは言語切り替えUIを持たないため、
 * 起動時に一度だけ解決して固定する（実行中に変わることはない）。
 */
function resolveLocale(): AppLocale {
  const [primary] = getLocales();

  return isAppLocale(primary?.languageCode) ? primary.languageCode : 'en';
}

const i18n = new I18n({ ja, en });

// 未対応の言語や、辞書に無いキーは英語へ落とす
i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.locale = resolveLocale();

/** 解決済みの表示言語。日付フォーマットの分岐にも使う */
export const locale = i18n.locale as AppLocale;

/** 翻訳を引く。`%{name}` の差し込みは第2引数のオブジェクトで渡す */
export function t(key: TranslationKey, options?: TranslateOptions): string {
  return i18n.t(key, options);
}
