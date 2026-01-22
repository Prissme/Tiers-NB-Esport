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

# Debug versions for reproducibility (node/npm/lockfileVersion)
RUN node -v && npm -v && node -p "require('./package-lock.json').lockfileVersion"

# Durcir npm contre les téléchargements corrompus/transitoires + install reproductible
RUN npm config set registry https://registry.npmjs.org/ \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set maxsockets 10 \
 && npm cache clean --force \
 && npm ci --legacy-peer-deps --no-audit --no-fund

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
