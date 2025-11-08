FROM node:20-alpine

WORKDIR /app

# Activer Corepack et installer Yarn 3.6
RUN corepack enable && corepack prepare yarn@3.6.4 --activate

# Copier les fichiers de dépendances
COPY package*.json ./

# Forcer la création du dossier node_modules (désactiver Plug’n’Play)
RUN yarn config set nodeLinker node-modules

# Installer les dépendances
RUN yarn install --no-immutable

# Copier le reste du code
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
