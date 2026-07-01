import { useState, useMemo, useEffect } from 'react';

export interface PaginationResult<T> {
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (size: number) => void;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  paginated: T[];
  resetPage: () => void;
}

/**
 * Shared pagination hook.
 * Pass already-filtered items — the hook handles slicing and page tracking.
 * Automatically resets to page 1 whenever the item array changes length
 * (i.e. when a filter is applied).
 */
export function usePagination<T>(
  items: T[],
  defaultPageSize = 10
): PaginationResult<T> {
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  // Reset to page 1 whenever the filtered list changes length
  useEffect(() => {
    setPageRaw(1);
  }, [items.length]);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const setPage = (p: number) =>
    setPageRaw(Math.max(1, Math.min(p, totalPages)));

  const setPageSize = (size: number) => {
    setPageSizeRaw(size);
    setPageRaw(1);
  };

  const startIndex = items.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, items.length);

  return {
    page: safePage,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
    totalItems: items.length,
    startIndex,
    endIndex,
    paginated,
    resetPage: () => setPageRaw(1),
  };
}
