import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  initialItemsPerPage?: number;
  threshold?: number;
}

/**
 * Hook for implementing infinite scroll pagination
 * @param totalItems - Total number of items available
 * @param options - Configuration options
 * @returns Object with current page, items to display, and loading state
 */
export function useInfiniteScroll<T>(
  items: T[],
  options: UseInfiniteScrollOptions = {}
) {
  const {
    initialItemsPerPage = 20,
    threshold = 0.8,
  } = options;

  const [displayedItems, setDisplayedItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset when items change
  useEffect(() => {
    const initialItems = items.slice(0, initialItemsPerPage);
    setDisplayedItems(initialItems);
    setPage(1);
    setHasMore(items.length > initialItemsPerPage);
    setIsLoading(false);
  }, [items, initialItemsPerPage]);

  // Load more items
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    // Simulate loading delay for smooth UX
    setTimeout(() => {
      const nextPage = page + 1;
      const startIndex = 0;
      const endIndex = nextPage * initialItemsPerPage;
      const newDisplayedItems = items.slice(startIndex, endIndex);

      setDisplayedItems(newDisplayedItems);
      setPage(nextPage);
      setHasMore(endIndex < items.length);
      setIsLoading(false);
    }, 300);
  }, [items, page, initialItemsPerPage, isLoading, hasMore]);

  // Set up intersection observer
  useEffect(() => {
    if (!sentinelRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        threshold,
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore, hasMore, isLoading, threshold]);

  return {
    displayedItems,
    hasMore,
    isLoading,
    sentinelRef,
    loadMore,
    reset: () => {
      setPage(1);
      setDisplayedItems(items.slice(0, initialItemsPerPage));
      setHasMore(items.length > initialItemsPerPage);
    },
  };
}
