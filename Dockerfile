# ==============================================================================
# Multi-stage Dockerfile para Backend Realtime (Socket.IO + WebRTC)
# Optimizado para producción y despliegue en Render
# ==============================================================================

# ETAPA 1: Construcción (Builder)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ==============================================================================
# ETAPA 2: Entorno de Ejecución (Runner / Producción)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 4000

CMD ["node", "dist/server.js"]
