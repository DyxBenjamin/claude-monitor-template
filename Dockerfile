FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY index.ts tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production \
    CLAUDE_MONITOR_DB=/data/claude-monitor.sqlite \
    CLAUDE_MONITOR_PORT=3000
VOLUME /data
EXPOSE 3000

ENTRYPOINT ["bun", "index.ts"]
CMD ["web"]
