"use client";

import { useEffect, useCallback } from "react";
import { useCursors, useOthers } from "@waits/openblocks-react";

export function useFollowUser(
  followingUserId: string | null,
  onAutoExit: () => void,
  applyViewport: (pos: { x: number; y: number }, scale: number) => void,
) {
  const cursors = useCursors();
  const others = useOthers();

  // Auto-exit when the followed user leaves the room (presence-based, not cursor-based)
  useEffect(() => {
    if (!followingUserId) return;
    const stillHere = others.some((u) => u.userId === followingUserId);
    if (!stillHere) onAutoExit();
  }, [followingUserId, others, onAutoExit]);

  // Apply viewport whenever cursor data arrives with viewport info
  useEffect(() => {
    if (!followingUserId) return;
    const cursor = cursors.get(followingUserId);
    console.log("[useFollowUser] effect fired, followingUserId:", followingUserId, "cursor:", cursor, "cursors.size:", cursors.size);
    if (!cursor?.viewportPos || cursor.viewportScale == null) {
      console.log("[useFollowUser] no viewportPos or scale, skipping. viewportPos:", cursor?.viewportPos, "viewportScale:", cursor?.viewportScale);
      return;
    }
    console.log("[useFollowUser] applying viewport:", cursor.viewportPos, cursor.viewportScale);
    applyViewport(cursor.viewportPos, cursor.viewportScale);
  }, [followingUserId, cursors, applyViewport]);
}
