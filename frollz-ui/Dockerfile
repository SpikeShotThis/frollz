# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json ./

RUN npm install && npm cache clean --force

# Development stage
FROM node:24-alpine AS development

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN chown -R node:node /app

EXPOSE 5173

USER node

CMD ["npm", "run", "dev"]

# Production build stage
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

RUN npm run build

# Production stage
FROM nginx:alpine AS production

COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# nosemgrep: dockerfile.security.missing-user.missing-user
# nginx must start as root to bind port 80, then drops to the nginx user for workers
CMD ["nginx", "-g", "daemon off;"]
