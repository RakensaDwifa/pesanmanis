export const VIDEO_PLAY_EVENT = "pm:video-play";
export const VIDEO_STOP_EVENT = "pm:video-stop";

export interface VideoSyncEventDetail {
  sourceId: string;
}

export interface MediaSyncHandlers {
  onVideoPlay?: (detail: VideoSyncEventDetail) => void;
  onVideoStop?: (detail: VideoSyncEventDetail) => void;
}

export interface MediaSyncController {
  notifyVideoPlay: (sourceId: string) => boolean;
  notifyVideoStop: (sourceId: string) => boolean;
  isAnyVideoPlaying: () => boolean;
  getActiveVideoIds: () => string[];
  subscribe: (handlers: MediaSyncHandlers) => () => void;
  reset: () => void;
}

function defaultEventTarget(): EventTarget | null {
  return typeof window !== "undefined" ? window : null;
}

/**
 * Creates a lightweight CustomEvent-based media synchronization controller
 * that tracks active video source IDs in a Set so unmount/component swaps
 * only resume background music once all active videos have stopped.
 */
export function createMediaSyncController(
  getTarget: () => EventTarget | null = defaultEventTarget
): MediaSyncController {
  const activeVideoIds = new Set<string>();

  const dispatch = (eventName: string, sourceId: string) => {
    const target = getTarget();
    if (!target || typeof CustomEvent === "undefined") return;
    target.dispatchEvent(
      new CustomEvent<VideoSyncEventDetail>(eventName, {
        detail: { sourceId },
      })
    );
  };

  const notifyVideoPlay = (sourceId: string): boolean => {
    const id = sourceId.trim();
    if (!id || activeVideoIds.has(id)) return false;
    activeVideoIds.add(id);
    dispatch(VIDEO_PLAY_EVENT, id);
    return true;
  };

  const notifyVideoStop = (sourceId: string): boolean => {
    const id = sourceId.trim();
    if (!id || !activeVideoIds.has(id)) return false;
    activeVideoIds.delete(id);
    if (activeVideoIds.size === 0) {
      dispatch(VIDEO_STOP_EVENT, id);
      return true;
    }
    return false;
  };

  const isAnyVideoPlaying = (): boolean => activeVideoIds.size > 0;

  const getActiveVideoIds = (): string[] => [...activeVideoIds];

  const subscribe = (handlers: MediaSyncHandlers): (() => void) => {
    const target = getTarget();
    if (!target) return () => {};

    const handlePlay = (event: Event) => {
      const detail = (event as CustomEvent<VideoSyncEventDetail>).detail;
      if (detail && typeof detail.sourceId === "string") {
        handlers.onVideoPlay?.(detail);
      }
    };

    const handleStop = (event: Event) => {
      const detail = (event as CustomEvent<VideoSyncEventDetail>).detail;
      if (detail && typeof detail.sourceId === "string") {
        handlers.onVideoStop?.(detail);
      }
    };

    if (handlers.onVideoPlay) {
      target.addEventListener(VIDEO_PLAY_EVENT, handlePlay);
    }
    if (handlers.onVideoStop) {
      target.addEventListener(VIDEO_STOP_EVENT, handleStop);
    }

    return () => {
      if (handlers.onVideoPlay) {
        target.removeEventListener(VIDEO_PLAY_EVENT, handlePlay);
      }
      if (handlers.onVideoStop) {
        target.removeEventListener(VIDEO_STOP_EVENT, handleStop);
      }
    };
  };

  const reset = () => {
    activeVideoIds.clear();
  };

  return {
    notifyVideoPlay,
    notifyVideoStop,
    isAnyVideoPlaying,
    getActiveVideoIds,
    subscribe,
    reset,
  };
}

const defaultController = createMediaSyncController();

export const notifyVideoPlay = defaultController.notifyVideoPlay;
export const notifyVideoStop = defaultController.notifyVideoStop;
export const isAnyVideoPlaying = defaultController.isAnyVideoPlaying;
export const getActiveVideoIds = defaultController.getActiveVideoIds;
export const subscribeMediaSync = defaultController.subscribe;
export const resetMediaSync = defaultController.reset;
