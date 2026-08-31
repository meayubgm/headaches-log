import { useCallback, useState } from 'react';

import type { TagType } from '@/constants/tag-types';
import { createTag } from '@/lib/db/repositories/tags';

export type TagSelection = {
  selectedTagIds: string[];
  toggleTag: (id: string) => void;
  /** その場でタグを作り、作成したタグを選択済みにする。失敗は呼び出し元へ throw する */
  createAndSelectTag: (name: string, type: TagType) => Promise<void>;
  clearTags: () => void;
};

/** 記録の入力画面3つ（ホーム／新規作成／詳細）で共通のタグ選択状態 */
export function useTagSelection(initialIds: string[] = []): TagSelection {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialIds);

  const toggleTag = useCallback((id: string) => {
    setSelectedTagIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }, []);

  const createAndSelectTag = useCallback(async (name: string, type: TagType) => {
    const tag = await createTag({ name, type });
    setSelectedTagIds((current) => [...current, tag.id]);
  }, []);

  const clearTags = useCallback(() => setSelectedTagIds([]), []);

  return { selectedTagIds, toggleTag, createAndSelectTag, clearTags };
}
