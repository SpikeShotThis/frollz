FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

# Copy package manifests for dependency installation (layer caching optimization)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/ui/package.json apps/ui/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/schema/package.json packages/schema/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/vitest-config/package.json packages/vitest-config/package.json

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm --filter @frollz2/schema build
RUN pnpm --filter @frollz2/ui build

# Runtime stage with nginx
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runner

# Copy nginx config first (less frequent changes)
COPY --chown=101:101 apps/ui/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built SPA
COPY --from=builder --chown=101:101 /app/apps/ui/dist/spa /usr/share/nginx/html

USER 101

EXPOSE 8080

# Health check for nginx
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
