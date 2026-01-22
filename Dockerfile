FROM node:20-alpine AS builder

WORKDIR /app

# Pin npm for reproducible installs
ARG NPM_VERSION=10.8.2

# Supabase build-time configuration
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1

# Installation outils build
RUN apk add --no-cache libc6-compat python3 make g++

# Ensure consistent npm version across builds
RUN npm install -g npm@${NPM_VERSION}

# Copie dépendances
COPY package.json package-lock.json ./

# Debug versions
RUN node -v && npm -v

# NPM hardening anti-tarball-corruption
ENV npm_config_registry=https://registry.npmjs.org/
ENV npm_config_cache=/tmp/npm-cache
ENV npm_config_prefer_online=true
ENV npm_config_progress=false
ENV npm_config_audit=false
ENV npm_config_fund=false
ENV npm_config_fetch_retries=10
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=180000
ENV npm_config_fetch_timeout=300000
ENV npm_config_maxsockets=1

# (optionnel mais souvent magique) couper le keep-alive Node (évite des flux cassés en Docker/proxy)
ENV NODE_OPTIONS=--http-parser=legacy

RUN rm -rf /tmp/npm-cache \
 && npm cache clean --force || true \
 && npm ci --legacy-peer-deps --no-audit --no-fund --foreground-scripts

# Copie du reste du projet
COPY . .

# Build + prune deps dev
RUN npm run build && \
    npm prune --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app

# Environnement
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/.next/standalone ./.next/standalone
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/discord-bot ./discord-bot
COPY --from=builder /app/ensure-fetch.js ./ensure-fetch.js
COPY --from=builder /app/load-env.js ./load-env.js
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

CMD ["node", "server.js"]
