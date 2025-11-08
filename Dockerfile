# Étape 1 — Build avec Yarn (stable et sans checksum)
FROM node:20-alpine AS builder
WORKDIR /app

# Installer Yarn (Corepack)
RUN corepack enable && corepack prepare yarn@4.5.1 --activate

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (sans intégrité, sans audit)
RUN yarn config set enableImmutableInstalls false && \
    yarn install --mode=skip-builds --no-immutable --check-files || \
    (echo "Retrying Yarn install..." && yarn install --mode=skip-builds --no-immutable --check-files)

# Étape 2 — Image finale propre
FROM node:20-alpine
WORKDIR /app

# Copier les dépendances depuis le builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
