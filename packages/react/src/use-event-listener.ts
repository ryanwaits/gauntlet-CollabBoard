import { useEffect, useRef } from "react";
import { useRoom } from "./room-context.js";

export function useEventListener<
  T extends Record<string, unknown> = Record<string, unknown>
>(
  callback: (event: T) => void
): void {
  const room = useRoom();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsub = room.subscribe("message", (msg) => {
      callbackRef.current(msg as T);
    });
    return unsub;
  }, [room]);
}
