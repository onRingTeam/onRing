import { useMemo } from 'react';

export interface UseNotesFilterOptions {
  query: string;
  starred: boolean;
}

/** 회의록 검색 필터 (클라이언트측 검색/별표) */
export function useNotesFilter(options: UseNotesFilterOptions) {
  return useMemo(() => {
    // 스텁: 실제 필터링 로직은 다음 단계
    return [];
  }, [options.query, options.starred]);
}
