import type { LiveObject } from "@waits/openblocks-client";
import type { PresenceUser } from "@waits/openblocks-types";
import { RoomProvider, useRoom, useIsInsideRoom, useStorageRoot } from "./room-context.js";
import { useStorage } from "./use-storage.js";
import { useSelf } from "./use-self.js";
import { useMyPresence, useUpdateMyPresence, type PresenceUpdatePayload } from "./use-my-presence.js";
import { useOthers, useOther, useOthersMapped, useOthersUserIds } from "./use-others.js";
import { useOthersListener } from "./use-others-listener.js";
import { useMutation } from "./use-mutation.js";
import { useBatch } from "./use-batch.js";
import { useStatus, useLostConnectionListener, useSyncStatus } from "./use-status.js";
import { useErrorListener } from "./use-error-listener.js";
import { useBroadcastEvent } from "./use-broadcast-event.js";
import { useEventListener } from "./use-event-listener.js";
import { useUndo, useRedo, useCanUndo, useCanRedo, useHistory } from "./use-undo-redo.js";
import { useLiveState, useLiveStateData, useSetLiveState } from "./use-live-state.js";
import { useCursors, useUpdateCursor } from "./use-cursors.js";
import { useOthersOnLocation, usePresenceEvent } from "./use-presence-event.js";

/**
 * Creates a typed set of hooks scoped to your application's presence and
 * storage types. All hooks work identically to their direct-import
 * counterparts — the factory just narrows the generic parameters.
 *
 * @example
 * type Presence = { cursor: { x: number; y: number } | null };
 * type Storage = { count: number; items: LiveList<string> };
 *
 * const {
 *   RoomProvider,
 *   useStorage,
 *   useSelf,
 *   useMyPresence,
 * } = createRoomContext<Presence, Storage>();
 */
export function createRoomContext<
  TPresence extends Record<string, unknown> = Record<string, unknown>,
  TStorage extends Record<string, unknown> = Record<string, unknown>,
>() {
  // Typed wrappers — cast generic params, zero runtime overhead
  function useStorageTyped<T>(selector: (root: LiveObject<TStorage>) => T): T | null {
    return useStorage(selector as (root: LiveObject) => T);
  }

  function useSelfTyped(): (PresenceUser & { presence: TPresence }) | null {
    return useSelf() as (PresenceUser & { presence: TPresence }) | null;
  }

  function useMyPresenceTyped(): [(PresenceUser & { presence: TPresence }) | null, (data: Partial<TPresence>) => void] {
    const [self, update] = useMyPresence();
    return [
      self as (PresenceUser & { presence: TPresence }) | null,
      update as (data: Partial<TPresence>) => void,
    ];
  }

  function useUpdateMyPresenceTyped(): (data: Partial<TPresence>) => void {
    return useUpdateMyPresence() as (data: Partial<TPresence>) => void;
  }

  return {
    // Providers
    RoomProvider,
    useRoom,
    useIsInsideRoom,
    useStorageRoot,

    // Storage
    useStorage: useStorageTyped,
    useMutation,
    useBatch,

    // Presence
    useSelf: useSelfTyped,
    useMyPresence: useMyPresenceTyped,
    useUpdateMyPresence: useUpdateMyPresenceTyped,
    useOthers,
    useOther,
    useOthersMapped,
    useOthersUserIds,
    useOthersListener,

    // Connection
    useStatus,
    useSyncStatus,
    useLostConnectionListener,
    useErrorListener,

    // Events
    useBroadcastEvent,
    useEventListener,

    // Undo/redo
    useHistory,
    useUndo,
    useRedo,
    useCanUndo,
    useCanRedo,

    // Live state
    useLiveState,
    useLiveStateData,
    useSetLiveState,

    // Cursors
    useCursors,
    useUpdateCursor,

    // Location + presence events
    useOthersOnLocation,
    usePresenceEvent,
  };
}
