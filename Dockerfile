# Utiliser Node 20 pour compatibilité Supabase
FROM node:20-alpine

# Désactiver les checks d’intégrité et forcer un cache npm propre
ENV NPM_CONFIG_SKIP_INTEGRITY_CHECKS=true
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false

# Créer un répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Nettoyer et réinitialiser le cache npm
RUN npm cache clean --force && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --omit=dev --legacy-peer-deps --no-audit --ignore-scripts --force

# Copier le reste du code
COPY . .

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "server.js"]
