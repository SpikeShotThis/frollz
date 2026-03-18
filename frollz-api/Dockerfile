# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Install development dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .
RUN chown -R node:node /app

# Expose port
EXPOSE 3000

USER node

# Start the application in development mode
CMD ["npm", "run", "start:dev"]

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy production dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the application
RUN npm run build
RUN chown -R node:node /app

# Expose port
EXPOSE 3000

USER node

# Start the application
CMD ["npm", "run", "start:prod"]
