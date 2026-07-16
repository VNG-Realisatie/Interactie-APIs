FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY server.js federated-auth.js ./
EXPOSE 3000
CMD ["node", "server.js"]
