# Étape 1 — Build propre
FROM node:20-alpine AS builder
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (sans audit, sans intégrité, avec retries)
RUN npm set progress=false \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm install --omit=dev --legacy-peer-deps --no-audit --force --prefer-online --ignore-scripts

# Étape 2 — Image finale
FROM node:20-alpine
WORKDIR /app

# Copier les node_modules depuis le builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
