# Étape 1 — Build avec Yarn 3.6 (ultra stable)
FROM node:20-alpine AS builder
WORKDIR /app

# Activer Corepack et utiliser Yarn 3.6.4
RUN corepack enable && corepack prepare yarn@3.6.4 --activate

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances sans audit ni scripts postinstall
RUN yarn config set enableImmutableInstalls false && \
    yarn install --no-immutable --check-cache || \
    (echo "Retrying Yarn install..." && yarn install --no-immutable --check-cache)

# Étape 2 — Image finale
FROM node:20-alpine
WORKDIR /app

# Copier les node_modules et le code
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
