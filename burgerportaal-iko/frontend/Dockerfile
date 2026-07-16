FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml tsconfig.json vite.config.ts index.html ./
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install
COPY src ./src
COPY public ./public
EXPOSE 5180
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5180"]
