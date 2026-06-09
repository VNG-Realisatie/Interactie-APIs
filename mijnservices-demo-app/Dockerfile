# Zero-dependency Node-app: geen build, geen npm install.
FROM node:22-slim

WORKDIR /app
COPY . .

# De server leest PORT en STATE_FILE uit de omgeving (zie fly.toml).
EXPOSE 8787
CMD ["node", "backend/server.mjs"]
