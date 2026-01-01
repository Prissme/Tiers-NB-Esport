FROM node:18-alpine AS builder

WORKDIR /app

# Supabase build-time configuration
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Installation outils build
RUN apk add --no-cache libc6-compat python3 make g++

# Copie tout
COPY . .

# Nettoyage et installation
RUN rm -rf node_modules package-lock.json && \
    npm install --legacy-peer-deps --production=false && \
    npm run build && \
    npm prune --production

FROM node:18-alpine AS runner

WORKDIR /app

# Environnement
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/discord-bot ./discord-bot
COPY --from=builder /app/ensure-fetch.js ./ensure-fetch.js
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000

CMD ["node", "server.js"]
