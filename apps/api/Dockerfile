FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

# Copy package manifests for dependency installation (layer caching optimization)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/ui/package.json apps/ui/package.json
COPY packages/schema/package.json packages/schema/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/vitest-config/package.json packages/vitest-config/package.json

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm --filter @frollz2/schema build
RUN pnpm --filter @frollz2/api build

# Production dependencies stage
FROM node:24-alpine AS deps
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/schema/package.json packages/schema/package.json

RUN pnpm install --frozen-lockfile --prod

# Runtime stage
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy production dependencies
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps --chown=node:node /app/packages/schema/node_modules ./packages/schema/node_modules

# Copy built artifacts and configs
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /app/packages/schema/dist ./packages/schema/dist
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=node:node /app/packages/schema/package.json ./packages/schema/package.json

USER node

EXPOSE 3000

# Health check for container monitoring
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "apps/api/dist/src/main.js"]
