# Étape 1 — Build avec Yarn (plus stable que npm)
FROM node:20-alpine AS builder
WORKDIR /app

# Installer Yarn globalement
RUN corepack enable && corepack prepare yarn@4.5.1 --activate

# Copier package.json et lockfile si présent
COPY package*.json ./

# Installer les dépendances sans vérification d’intégrité
RUN yarn config set enableImmutableInstalls false && \
    yarn config set networkTimeout 300000 && \
    yarn install --mode=skip-builds --no-immutable --check-files

# Étape 2 — Image finale propre
FROM node:20-alpine
WORKDIR /app

# Copier les dépendances depuis le builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
