import { useCallback } from "react";
import { useRoom } from "./room-context.js";

export function useBroadcastEvent<
  T extends { type: string } = { type: string; [key: string]: unknown }
>(): (event: T) => void {
  const room = useRoom();
  return useCallback(
    (event: T) => room.send(event),
    [room]
  );
}
