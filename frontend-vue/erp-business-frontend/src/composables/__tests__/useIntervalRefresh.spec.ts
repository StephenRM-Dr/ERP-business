import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createIntervalRefresh } from '../useIntervalRefresh';

describe('createIntervalRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function hideDocument(hidden: boolean): void {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(hidden ? 'hidden' : 'visible');
  }

  it('invokes the callback once per interval', () => {
    const callback = vi.fn();
    const refresher = createIntervalRefresh(callback, 30_000);

    refresher.start();
    vi.advanceTimersByTime(90_000);

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('does not start a second timer when started twice', () => {
    const callback = vi.fn();
    const refresher = createIntervalRefresh(callback, 30_000);

    refresher.start();
    refresher.start();
    vi.advanceTimersByTime(30_000);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('stops polling once stopped', () => {
    const callback = vi.fn();
    const refresher = createIntervalRefresh(callback, 30_000);

    refresher.start();
    refresher.stop();
    vi.advanceTimersByTime(90_000);

    expect(callback).not.toHaveBeenCalled();
    expect(refresher.isRunning()).toBe(false);
  });

  it('pauses polling while the tab is hidden', () => {
    const callback = vi.fn();
    const refresher = createIntervalRefresh(callback, 30_000);
    refresher.start();

    hideDocument(true);
    refresher.handleVisibilityChange();
    vi.advanceTimersByTime(90_000);

    // A screen nobody is looking at must not keep hitting the backend.
    expect(callback).not.toHaveBeenCalled();
    expect(refresher.isRunning()).toBe(false);
  });

  it('refreshes immediately and resumes when the tab becomes visible again', () => {
    const callback = vi.fn();
    const refresher = createIntervalRefresh(callback, 30_000);
    refresher.start();

    hideDocument(true);
    refresher.handleVisibilityChange();
    hideDocument(false);
    refresher.handleVisibilityChange();

    // One immediate catch-up call, because the list is stale by definition.
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('keeps polling when the catch-up callback throws', () => {
    const callback = vi.fn(() => {
      throw new Error('refresh failed');
    });
    const refresher = createIntervalRefresh(callback, 30_000);
    refresher.start();

    hideDocument(true);
    refresher.handleVisibilityChange();
    hideDocument(false);
    expect(() => refresher.handleVisibilityChange()).toThrow('refresh failed');

    expect(refresher.isRunning()).toBe(true);

    // Fake timers rethrow out of the tick, where a real browser interval would
    // survive the throw on its own. Either way the timer fired again, which is
    // what this test is about.
    expect(() => vi.advanceTimersByTime(30_000)).toThrow('refresh failed');
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('is safe to stop when never started', () => {
    const refresher = createIntervalRefresh(vi.fn(), 30_000);

    expect(() => refresher.stop()).not.toThrow();
  });
});
