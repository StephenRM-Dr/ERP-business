import { onBeforeUnmount, onMounted } from 'vue';

/**
 * Timer logic for a self-refreshing screen, kept free of Vue lifecycle hooks
 * so it can be tested with fake timers and no component mounting.
 */
export function createIntervalRefresh(callback: () => void, intervalMs: number) {
  let timer: ReturnType<typeof setInterval> | null = null;

  function isRunning(): boolean {
    return timer !== null;
  }

  function start(): void {
    if (timer !== null) {
      return;
    }
    timer = setInterval(callback, intervalMs);
  }

  function stop(): void {
    if (timer === null) {
      return;
    }
    clearInterval(timer);
    timer = null;
  }

  /**
   * Polling a tab nobody is looking at is free load on the backend, so the
   * timer is dropped while hidden and the list is caught up on return.
   */
  function handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      stop();
      return;
    }
    // The interval must be restored even if the catch-up call throws: a browser
    // timer survives a throwing callback, and this path should not be the one
    // place where a single failure permanently freezes a shop-floor screen.
    try {
      callback();
    } finally {
      start();
    }
  }

  return { start, stop, handleVisibilityChange, isRunning };
}

/** Wires {@link createIntervalRefresh} to a component's lifecycle. */
export function useIntervalRefresh(callback: () => void, intervalMs: number): void {
  const refresher = createIntervalRefresh(callback, intervalMs);

  onMounted(() => {
    refresher.start();
    document.addEventListener('visibilitychange', refresher.handleVisibilityChange);
  });

  onBeforeUnmount(() => {
    refresher.stop();
    document.removeEventListener('visibilitychange', refresher.handleVisibilityChange);
  });
}
