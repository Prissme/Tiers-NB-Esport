# Étape 1 — Build propre avec npm
FROM node:20-alpine AS builder
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Configurer npm pour ignorer les intégrités et les audits
RUN npm set fund false \
 && npm set audit false \
 && npm set progress false \
 && npm set fetch-retries 5 \
 && npm set fetch-retry-mintimeout 20000 \
 && npm set fetch-retry-maxtimeout 120000 \
 && npm config set strict-ssl false \
 && npm config set registry https://registry.npmjs.org/ \
 && npm install --omit=dev --legacy-peer-deps --no-audit --force --prefer-online --ignore-scripts || true

# Étape 2 — Image finale (plus légère)
FROM node:20-alpine
WORKDIR /app

# Copier les node_modules déjà installés depuis l’étape build
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
