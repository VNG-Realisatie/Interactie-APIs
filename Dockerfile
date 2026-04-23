FROM node:20-alpine
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY apis ./apis
COPY schemas ./schemas
COPY patterns ./patterns
COPY scripts/mock-all.js ./scripts/

EXPOSE 4010
CMD ["node", "scripts/mock-all.js"]
