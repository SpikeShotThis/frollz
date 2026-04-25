FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/ui/package.json apps/ui/package.json
COPY packages/schema/package.json packages/schema/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/vitest-config/package.json packages/vitest-config/package.json

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @frollz2/schema build
RUN pnpm --filter @frollz2/api build

FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app /app

USER node

EXPOSE 3000
CMD ["node", "apps/api/dist/src/main.js"]
