FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer TOUTES les dépendances (discord.js inclus)
RUN npm ci

# Copier le reste du code
COPY . .

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Exposer le port
EXPOSE 3000

# Commande de démarrage par défaut (sera override par Koyeb)
CMD ["npm", "start"]
