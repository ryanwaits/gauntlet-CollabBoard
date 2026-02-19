import { useSyncExternalStore, useCallback, useEffect, useRef } from "react";
import type { ConnectionStatus } from "@waits/openblocks-types";
import { useRoom } from "./room-context.js";

/**
 * Returns the current WebSocket connection status of the room.
 * Re-renders whenever the status changes.
 *
 * Possible values: `"connecting"` | `"connected"` | `"reconnecting"` | `"disconnected"`
 *
 * @example
 * const status = useStatus();
 * if (status !== "connected") return <Badge>{status}</Badge>;
 */
export function useStatus(): ConnectionStatus {
  const room = useRoom();
  return useSyncExternalStore(
    useCallback((cb) => room.subscribe("status", () => cb()), [room]),
    useCallback(() => room.getStatus(), [room]),
    () => "disconnected" as ConnectionStatus
  );
}

/**
 * Fires a callback once whenever the connection drops from `"connected"`
 * to `"reconnecting"`. Does not fire on intentional disconnect.
 *
 * @param callback - Stable reference recommended (internally stored in a ref)
 *
 * @example
 * useLostConnectionListener(() => toast("Connection lost, reconnecting…"));
 */
export function useLostConnectionListener(
  callback: () => void
): void {
  const room = useRoom();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const prevStatusRef = useRef<ConnectionStatus | null>(null);

  useEffect(() => {
    const unsub = room.subscribe("status", (status) => {
      if (
        status === "reconnecting" &&
        prevStatusRef.current === "connected"
      ) {
        callbackRef.current();
      }
      prevStatusRef.current = status;
    });
    return unsub;
  }, [room]);
}
