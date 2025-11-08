# Étape 1 — Build avec Yarn (propre et stable)
FROM node:20-alpine AS builder
WORKDIR /app

# Activer Yarn via Corepack
RUN corepack enable && corepack prepare yarn@4.5.1 --activate

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (sans intégrité, sans scripts postinstall)
RUN yarn config set enableImmutableInstalls false && \
    yarn install --no-immutable --check-cache --inline-builds=false || \
    (echo "Retrying Yarn install..." && yarn install --no-immutable --check-cache --inline-builds=false)

# Étape 2 — Image finale légère
FROM node:20-alpine
WORKDIR /app

# Copier les modules et le code
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
