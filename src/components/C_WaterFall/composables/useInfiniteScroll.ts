import { ref, readonly, watch, onMounted, onBeforeUnmount } from "vue";
import type { Ref } from "vue";
import type { InfiniteScrollStatus } from "../types";
import { INFINITE_SCROLL_THRESHOLD } from "../constants";

export function useInfiniteScroll(
  sentinelRef: Ref<HTMLElement | undefined>,
  enabled: Ref<boolean>,
  loading: Ref<boolean>,
  noMore: Ref<boolean>,
  onLoadMore: () => void,
) {
  const status = ref<InfiniteScrollStatus>("idle");
  let observer: IntersectionObserver | null = null;

  function handleIntersect(entries: IntersectionObserverEntry[]) {
    const entry = entries[0];
    if (!entry?.isIntersecting) return;
    if (!enabled.value || loading.value || noMore.value) return;
    status.value = "loading";
    onLoadMore();
  }

  function startObserving() {
    const el = sentinelRef.value;
    if (!el || !enabled.value) return;
    observer = new IntersectionObserver(handleIntersect, {
      rootMargin: `${INFINITE_SCROLL_THRESHOLD}px 0px`,
    });
    observer.observe(el);
  }

  function stopObserving() {
    observer?.disconnect();
    observer = null;
  }

  watch([loading, noMore], () => {
    if (noMore.value) {
      status.value = "no-more";
    } else if (loading.value) {
      status.value = "loading";
    } else {
      status.value = "idle";
    }
  });

  onMounted(startObserving);
  onBeforeUnmount(stopObserving);

  watch([sentinelRef, enabled], () => {
    stopObserving();
    startObserving();
  });

  return { status: readonly(status) };
}
