# Backend (REST API + Biometric Gateway) image.
# Build from repository root (build context = repo root):
#   docker build -f backend/Dockerfile -t gvfitness-backend:local .
#
# On Railway:
#   Root Directory = "/"
#   Dockerfile Path = "backend/Dockerfile"

FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Copy dependency manifests
COPY package.json ./
COPY backend/package.json backend/package-lock.json* ./backend/

WORKDIR /app/backend
RUN npm ci --omit=dev || npm install --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Copy node_modules from deps stage
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/backend/package.json ./backend/package.json

# Copy backend source files
COPY backend ./backend

WORKDIR /app/backend

# Make docker entrypoint executable
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Expose ports:
# 5000: Main REST API & Invoices
# 8081: eSSL K90 Pro Device Gateway (/iclock push protocol)
EXPOSE 5000 8081

ENTRYPOINT ["./docker-entrypoint.sh"]

