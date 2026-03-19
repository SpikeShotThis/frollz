# ─── Stage 1: Build Vue SPA ────────────────────────────────────────────────────
FROM node:24-alpine AS ui-build

WORKDIR /app/ui

COPY frollz-ui/package*.json ./
RUN npm ci

COPY frollz-ui/ .

# /api is relative — resolves correctly for any domain or port in the
# combined container, and via the Vite proxy in development.
RUN VITE_API_URL=/api npm run build


# ─── Stage 2: Compile NestJS API ───────────────────────────────────────────────
FROM node:24-alpine AS api-build

WORKDIR /app/api

COPY frollz-api/package*.json ./
RUN npm ci

COPY frollz-api/ .

# nest build compiles src/ and migrations/ (both in tsconfig includes) to dist/
RUN npm run build


# ─── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:24-alpine AS production

LABEL org.opencontainers.image.source=https://github.com/joshholl/frollz
LABEL org.opencontainers.image.description="Frollz — film roll tracking for photographers"

WORKDIR /app

# Install production dependencies only
COPY frollz-api/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled API (includes dist/migrations compiled from frollz-api/migrations/)
COPY --from=api-build /app/api/dist ./dist

# Vue SPA served as static files by ServeStaticModule at /app/public
COPY --from=ui-build /app/ui/dist ./public

RUN addgroup -S frollz && adduser -S frollz -G frollz \
    && chown -R frollz:frollz /app

USER frollz

EXPOSE 3000

CMD ["node", "dist/main"]
