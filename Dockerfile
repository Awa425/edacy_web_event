FROM node:18-alpine

# Installer les dépendances
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# Copier les sources
COPY . .

# Exposer le port 4200
EXPOSE 4200

# Commande par défaut
CMD ["npm", "run", "start", "--", "--host=0.0.0.0"]
