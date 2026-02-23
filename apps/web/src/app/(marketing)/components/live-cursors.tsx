"use client";

import { useState, type ReactNode } from "react";
import { LivelyClient } from "@waits/lively-client";
import { LivelyProvider, RoomProvider } from "@waits/lively-react";
import { CursorOverlay, useCursorTracking, generateFunName } from "@waits/lively-ui";

const serverUrl =
  process.env.NEXT_PUBLIC_LIVELY_URL || "http://localhost:1999";

const client = new LivelyClient({ serverUrl });

function CursorCanvas({ children }: { children: ReactNode }) {
  const { ref, onMouseMove } = useCursorTracking<HTMLDivElement>();

  return (
    <div ref={ref} onMouseMove={onMouseMove} className="relative">
      <CursorOverlay mode="name" inactivityTimeout={5000} />
      {children}
    </div>
  );
}

export function LiveCursors({ children }: { children: ReactNode }) {
  const [userId] = useState(() => crypto.randomUUID().slice(0, 8));
  const [displayName] = useState(() => generateFunName());

  return (
    <LivelyProvider client={client}>
      <RoomProvider roomId="landing" userId={userId} displayName={displayName}>
        <CursorCanvas>{children}</CursorCanvas>
      </RoomProvider>
    </LivelyProvider>
  );
}
