# syntax=docker/dockerfile:1

# --- Stage 1: dependencies ---
FROM node:18-bullseye-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./

ENV NEXT_TELEMETRY_DISABLED=1 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_CACHE=/tmp/.npm \
    NPM_CONFIG_PREFER_OFFLINE=true

ARG NPM_IGNORE_SCRIPTS=true

RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    if [ "$NPM_IGNORE_SCRIPTS" = "true" ]; then \
      npm ci --ignore-scripts; \
    else \
      npm ci; \
    fi

# --- Stage 2: build ---
FROM node:18-bullseye-slim AS builder

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=384

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json

COPY . .

RUN npm run build

# --- Stage 2: runtime ---
FROM node:18-bullseye-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/discord-bot ./discord-bot
COPY --from=builder /app/ensure-fetch.js ./ensure-fetch.js
COPY --from=builder /app/api ./api
COPY --from=builder /app/data ./data

EXPOSE 3000

CMD ["node", "server.js"]
