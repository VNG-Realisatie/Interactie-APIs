FROM node:22-alpine
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate && pnpm install --frozen-lockfile

COPY apis ./apis
COPY schemas ./schemas
COPY patterns ./patterns
COPY scripts/mock-all.js ./scripts/

EXPOSE 4010
CMD ["node", "scripts/mock-all.js"]
