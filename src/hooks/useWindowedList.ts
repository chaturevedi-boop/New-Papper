import { useCallback, useEffect, useRef, useState } from 'react';

export interface WindowedList<T> {
  visible: T[];
  hasMore: boolean;
  remaining: number;
  // Attach to an element at the end of the list - scrolling it into view reveals the next chunk
  sentinelRef: (node: HTMLElement | null) => void;
  revealMore: () => void;
}

// Renders long lists a chunk at a time instead of mounting every row up front. With 500+
// flats - each carrying nested paper chips and action buttons - a full render costs thousands
// of DOM nodes and makes scrolling stutter on a phone. An IntersectionObserver on a sentinel
// at the list's tail pulls in the next chunk just before the user reaches it, which keeps
// scrolling continuous without pulling in a virtualization dependency.
export function useWindowedList<T>(items: T[], chunkSize = 40): WindowedList<T> {
  const [visibleCount, setVisibleCount] = useState(chunkSize);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Any change to the underlying list (a new filter, a search term) starts the window over
  useEffect(() => {
    setVisibleCount(chunkSize);
  }, [items, chunkSize]);

  const revealMore = useCallback(() => {
    setVisibleCount(count => Math.min(count + chunkSize, items.length));
  }, [chunkSize, items.length]);

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(entry => entry.isIntersecting)) revealMore();
      },
      // Start loading slightly before the sentinel is actually on screen
      { rootMargin: '300px' }
    );
    observer.observe(node);
    observerRef.current = observer;
  }, [revealMore]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return {
    visible: visibleCount >= items.length ? items : items.slice(0, visibleCount),
    hasMore: visibleCount < items.length,
    remaining: Math.max(0, items.length - visibleCount),
    sentinelRef,
    revealMore
  };
}
