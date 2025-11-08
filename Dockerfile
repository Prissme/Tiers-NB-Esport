# Utiliser Node 20
FROM node:20-alpine

# Créer un répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances et node_modules déjà installés localement
COPY package*.json ./
COPY node_modules ./node_modules
COPY . .

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "server.js"]
