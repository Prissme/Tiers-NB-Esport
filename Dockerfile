FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (utilise npm install au lieu de npm ci)
RUN npm install --omit=dev --legacy-peer-deps --no-audit --ignore-scripts


# Copier le reste du code
COPY . .

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]
