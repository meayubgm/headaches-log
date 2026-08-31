export const ja = {
  app: {
    title: '頭痛ログ',
  },
  tabs: {
    home: 'ホーム',
    calendar: 'カレンダー',
  },
  navigation: {
    back: '戻る',
    newHeadache: '記録を追加',
    headacheDetail: '記録の詳細',
  },
  painLevels: {
    mild: '軽い',
    painful: 'つらい',
    severe: 'かなりつらい',
    unbearable: '耐えられない',
  },
  headacheTypes: {
    migraine: '片頭痛',
    tension: '緊張型',
    other: 'その他',
  },
  home: {
    painQuestion: 'いまの痛みは？',
    save: '記録する',
    saved: '記録しました',
    recentTitle: '最近の記録',
  },
  editor: {
    painLevelTitle: '痛みの度合い',
    create: '記録する',
    update: '保存する',
    updated: '保存しました',
    delete: 'この記録を削除',
    deleteA11y: 'この記録を削除する',
    deleteConfirmTitle: '記録を削除しますか？',
    deleteConfirmMessage: 'この操作は取り消せません。',
    deleteConfirmLabel: '削除する',
    notFound: '記録が見つかりません。削除された可能性があります。',
  },
  detailForm: {
    typesTitle: '頭痛の種類（複数選択可）',
    typeChipA11y: '頭痛の種類 %{name}',
    occurredAtTitle: '発生時刻',
    memoTitle: 'メモ',
    memoPlaceholder: '気づいたことがあれば',
    shortcutNow: 'いま',
    shortcutMinutesAgo: '%{minutes}分前',
    shortcutHoursAgo: '%{hours}時間前',
    shortcutNowA11y: '発生時刻をいまにする',
    shortcutShiftA11y: '発生時刻を%{label}にずらす',
  },
  dateTimeField: {
    change: '変更',
    done: '完了',
    changeA11y: '発生時刻を変更',
    doneA11y: '発生時刻の変更を完了',
  },
  dateTimeWheel: {
    month: '月',
    day: '日',
    hour: '時',
    minute: '分',
    /** 月列の項目。日本語だけ「月」が付くため、数値の直書きではなくキー経由で組み立てる */
    monthItem: '%{month}月',
    inputA11y: '%{label}を入力',
  },
  detailToggle: {
    open: '詳細を入力（任意）',
    close: '詳細を閉じる',
  },
  calendar: {
    title: 'カレンダー',
    prevMonth: '前の月へ',
    nextMonth: '次の月へ',
    addRecord: '＋ この日に記録を追加',
    addRecordA11y: '%{date}に記録を追加する',
    dayA11y: '%{date} %{summary}',
    daySummary: '頭痛%{count}件 最大%{label}',
    dayNoRecord: '記録なし',
    emptyLoading: '読み込み中…',
    emptyError: '読み込みに失敗したため表示できません。',
    emptyReady: 'この日の記録はありません。',
  },
  headacheList: {
    empty: 'まだ記録がありません。痛みの度合いを選んで記録してみましょう。',
    typeSeparator: '・',
    /** 時刻と痛み度合いのあいだ。日本語は全角空白で足りるが英語は区切り記号が要る */
    levelSeparator: '　',
    openRecordA11y: '%{time} %{level} の記録を開く',
  },
  painLevelSelector: {
    a11y: '痛みの度合い %{level}: %{label}',
  },
  confirmDialog: {
    cancel: 'キャンセル',
  },
  errors: {
    saveFailed: '保存に失敗しました: %{message}',
    headacheNotFound: 'この記録は見つかりませんでした。他の端末で削除された可能性があります。',
    loadFailed: '記録の読み込みに失敗しました: %{message}',
    dbInitFailed: 'データベースの初期化に失敗しました',
  },
};

export type Translations = typeof ja;
