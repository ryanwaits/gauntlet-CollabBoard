import { LivelyServer } from "@waits/lively-server";

const PORT = parseInt(process.env.PORT || process.env.LIVELY_PORT || "1999", 10);

const server = new LivelyServer({
  path: "/rooms",
  onJoin: (roomId, user) => {
    console.log(`[lively] join: ${user.displayName} (${user.userId}) → room ${roomId}`);
  },
  onLeave: (roomId, user) => {
    console.log(`[lively] leave: ${user.displayName} (${user.userId}) ← room ${roomId}`);
  },
});

await server.start(PORT);
console.log(`[lively] Server listening on :${server.port}`);
