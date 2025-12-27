# syntax=docker/dockerfile:1

# --- Stage 1: dependencies + build ---
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# Copier uniquement les manifestes pour installer les dépendances
COPY package.json package-lock.json ./

# Installer toutes les dépendances sans exécuter de scripts
RUN npm ci --ignore-scripts

# Copier le code source avant le build
COPY . .

# Construire l'application Next.js explicitement
RUN npm run build

# --- Stage 2: runtime léger ---
FROM node:18-bullseye-slim AS runner

WORKDIR /app

# Copier uniquement les manifestes pour installer les dépendances de production
COPY package.json package-lock.json ./

# Installer les dépendances de prod sans exécuter de scripts
RUN npm ci --omit=dev --ignore-scripts

# Copier les artefacts nécessaires à l'exécution
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js

EXPOSE 3000

# Démarrer le serveur Next.js custom
CMD ["node", "server.js"]
