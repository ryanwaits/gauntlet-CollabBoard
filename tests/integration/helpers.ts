import type { ServerMessage } from "../../src/types/messages";

const DEFAULT_PORT = 1998; // avoid conflict with dev server on 1999

export function getPort(): number {
  return DEFAULT_PORT;
}

export async function startPartyKit(port = DEFAULT_PORT): Promise<{
  proc: ReturnType<typeof Bun.spawn>;
  port: number;
}> {
  const proc = Bun.spawn(
    ["bunx", "partykit", "dev", "--port", String(port)],
    {
      cwd: import.meta.dir + "/../..",
      env: {
        ...process.env,
        // No Supabase — server falls back to in-memory with default frame
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        AI_SECRET: "test-secret",
      },
      stdout: "pipe",
      stderr: "pipe",
    }
  );

  // Poll HTTP until ready
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/parties/main/health-check`);
      if (res.ok || res.status === 200) return { proc, port };
    } catch {
      // not ready yet
    }
    await Bun.sleep(300);
  }

  proc.kill();
  throw new Error(`PartyKit failed to start within 15s on port ${port}`);
}

export function stopPartyKit(proc: ReturnType<typeof Bun.spawn>) {
  try {
    proc.kill();
  } catch {
    // already exited
  }
}

interface WsClient {
  ws: WebSocket;
  messages: ServerMessage[];
  waitForMessage: (type: string, timeout?: number) => Promise<ServerMessage>;
  close: () => void;
}

export function createWsClient(
  port: number,
  roomId: string,
  userId: string,
  displayName = "TestUser"
): Promise<WsClient> {
  return new Promise((resolve, reject) => {
    const url = `ws://127.0.0.1:${port}/parties/main/${roomId}?userId=${userId}&displayName=${encodeURIComponent(displayName)}`;
    const ws = new WebSocket(url);
    const messages: ServerMessage[] = [];

    const timeout = setTimeout(() => {
      reject(new Error(`WebSocket connection timeout for ${userId}`));
    }, 5000);

    ws.onopen = () => {
      clearTimeout(timeout);
      resolve({
        ws,
        messages,
        waitForMessage: (type: string, waitTimeout = 5000) => {
          // Check existing messages first
          const existing = messages.find((m) => m.type === type);
          if (existing) return Promise.resolve(existing);

          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              rej(new Error(`Timeout waiting for message type "${type}" (userId=${userId})`));
            }, waitTimeout);

            const originalOnMessage = ws.onmessage;
            ws.onmessage = (event) => {
              const msg: ServerMessage = JSON.parse(event.data as string);
              messages.push(msg);
              if (msg.type === type) {
                clearTimeout(timer);
                ws.onmessage = originalOnMessage;
                res(msg);
              }
            };
          });
        },
        close: () => {
          ws.close();
        },
      });
    };

    ws.onmessage = (event) => {
      messages.push(JSON.parse(event.data as string));
    };

    ws.onerror = (e) => {
      clearTimeout(timeout);
      reject(e);
    };
  });
}

/** Wait for a specific message type from accumulated messages, with polling */
export async function waitForCondition(
  check: () => boolean,
  timeout = 5000,
  label = "condition"
): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (check()) return;
    await Bun.sleep(50);
  }
  throw new Error(`Timeout waiting for ${label}`);
}
