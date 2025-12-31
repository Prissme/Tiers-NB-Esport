FROM node:18-alpine

WORKDIR /app

# Installation outils build
RUN apk add --no-cache libc6-compat python3 make g++

# Copie tout
COPY . .

# Nettoyage et installation
RUN rm -rf node_modules package-lock.json && \
    npm install --legacy-peer-deps --production=false && \
    npm run build && \
    npm prune --production

# Environnement
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["node", "server.js"]
