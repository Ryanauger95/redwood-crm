"use client";

import { useState, useCallback, useMemo } from "react";

export function useRowSelection<TId extends string | number>(
  visibleIds: TId[],
  totalCount: number,
  pageCount: number
) {
  const [selectedIds, setSelectedIds] = useState<Set<TId>>(new Set());
  const [allPagesSelected, setAllPagesSelected] = useState(false);

  const selectedCount = allPagesSelected ? totalCount : selectedIds.size;
  const hasMultiplePages = pageCount > 1;

  const allOnPageSelected = useMemo(
    () => visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id)),
    [visibleIds, selectedIds]
  );

  const someOnPageSelected = useMemo(
    () => visibleIds.some((id) => selectedIds.has(id)),
    [visibleIds, selectedIds]
  );

  const toggleOne = useCallback((id: TId) => {
    setAllPagesSelected(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allOnPageSelected) {
      // Deselect all on this page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      });
      setAllPagesSelected(false);
    } else {
      // Select all on this page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) next.add(id);
        return next;
      });
    }
  }, [allOnPageSelected, visibleIds]);

  const selectAllPages = useCallback(() => {
    setAllPagesSelected(true);
    // Also select all visible so checkboxes look right
    setSelectedIds(new Set(visibleIds));
  }, [visibleIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setAllPagesSelected(false);
  }, []);

  const isSelected = useCallback(
    (id: TId) => allPagesSelected || selectedIds.has(id),
    [allPagesSelected, selectedIds]
  );

  return {
    selectedIds,
    selectedCount,
    allPagesSelected,
    hasMultiplePages,
    allOnPageSelected,
    someOnPageSelected,
    isSelected,
    toggleOne,
    toggleAll,
    selectAllPages,
    clearSelection,
  };
}
