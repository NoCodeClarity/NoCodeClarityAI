FROM oven/bun:1.3 AS base
WORKDIR /app

# Copy workspace root files
COPY package.json bun.lock tsconfig.json ./

# Copy packages
COPY packages/tools/ packages/tools/
COPY packages/orchestrator/ packages/orchestrator/

# Install dependencies
RUN bun install --frozen-lockfile

# Expose port
ENV ORCHESTRATOR_PORT=3001
EXPOSE 3001

# Start orchestrator
CMD ["bun", "run", "packages/orchestrator/src/server.ts"]
