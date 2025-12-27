# syntax=docker/dockerfile:1

# --- Stage 1: dependencies + build ---
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# Copier uniquement les manifestes
COPY package.json package-lock.json ./

# FIX: Nettoyer cache npm + timeouts + retries
RUN npm cache clean --force && \
    npm config set fetch-timeout 120000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --ignore-scripts

# Copier le code source
COPY . .

# Build Next.js
RUN npm run build

# --- Stage 2: runtime ---
FROM node:18-bullseye-slim AS runner

WORKDIR /app

COPY package.json package-lock.json ./

# FIX: Même stratégie pour prod dependencies
RUN npm cache clean --force && \
    npm config set fetch-timeout 120000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --omit=dev --ignore-scripts

# Copier artefacts depuis builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/discord-bot ./discord-bot
COPY --from=builder /app/ensure-fetch.js ./ensure-fetch.js
COPY --from=builder /app/api ./api

EXPOSE 3000

CMD ["node", "server.js"]
