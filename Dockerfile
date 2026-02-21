FROM oven/bun:1
WORKDIR /app

# 1. Copy manifests for workspace resolution
COPY package.json bun.lock ./
COPY packages/types/package.json packages/types/
COPY packages/storage/package.json packages/storage/
COPY packages/server/package.json packages/server/
COPY examples/nextjs-whiteboard/package.json examples/nextjs-whiteboard/

# 2. Install all deps (including devDeps for bunup build tool)
RUN bun install --frozen-lockfile

# 3. Copy + build workspace packages (dependency order)
COPY packages/types/ packages/types/
RUN cd packages/types && bun run build

COPY packages/storage/ packages/storage/
RUN cd packages/storage && bun run build

COPY packages/server/ packages/server/
RUN cd packages/server && bun run build

# 4. Copy only what the server entry point needs
COPY examples/nextjs-whiteboard/server/ examples/nextjs-whiteboard/server/
COPY examples/nextjs-whiteboard/src/types/ examples/nextjs-whiteboard/src/types/

EXPOSE 10000
CMD ["bun", "run", "examples/nextjs-whiteboard/server/openblocks.ts"]
