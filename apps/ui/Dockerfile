FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/ui/package.json apps/ui/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/schema/package.json packages/schema/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/vitest-config/package.json packages/vitest-config/package.json

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @frollz2/schema build
RUN pnpm --filter @frollz2/ui build

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runner

COPY apps/ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=101:101 /app/apps/ui/dist/spa /usr/share/nginx/html

USER 101

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
