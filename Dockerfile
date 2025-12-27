# syntax=docker/dockerfile:1

# --- Stage 1: dependencies + build ---
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# Copier SEULEMENT package.json (ignorer le lockfile corrompu)
COPY package.json ./

# Installer sans lockfile = résolution fraîche
RUN npm cache clean --force && \
    npm install --no-package-lock --ignore-scripts --legacy-peer-deps

# Copier le code source
COPY . .

# Build Next.js
RUN npm run build

# --- Stage 2: runtime ---
FROM node:18-bullseye-slim AS runner

WORKDIR /app

COPY package.json ./

# Même stratégie pour prod
RUN npm cache clean --force && \
    npm install --no-package-lock --omit=dev --ignore-scripts --legacy-peer-deps

# Copier tous les artefacts nécessaires
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/discord-bot ./discord-bot
COPY --from=builder /app/ensure-fetch.js ./ensure-fetch.js
COPY --from=builder /app/api ./api
COPY --from=builder /app/data ./data
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/app ./app
COPY --from=builder /app/tailwind.config.js ./tailwind.config.js
COPY --from=builder /app/postcss.config.js ./postcss.config.js

EXPOSE 3000

CMD ["node", "server.js"]
