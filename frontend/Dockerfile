# Web (frontend) image. Build from repository root (build context = repo root):
#   docker build -f frontend/Dockerfile -t gvfitness-web:local .
#
# On Railway:
#   Root Directory = "/"
#   Dockerfile Path = "frontend/Dockerfile"
#
# NOTE: VITE_* values are baked in at BUILD time, not runtime.
# Pass VITE_API_URL and optionally VITE_PUBLIC_INVOICE_BASE_URL as service variables in Railway;
# they are forwarded to the build via the ARG lines below.

FROM node:20-bookworm-slim AS build
WORKDIR /app

# Copy dependency manifests
COPY package.json ./
COPY frontend/package.json frontend/package-lock.json* ./frontend/

WORKDIR /app/frontend

# Install dependencies (lockfile may have been generated on Windows/macOS)
RUN npm ci --include=optional || npm install

# npm ci can skip Linux-only optional deps; Vite/Rollup needs this on Linux/Railway
RUN npm install @rollup/rollup-linux-x64-gnu --cpu=x64 --os=linux --no-save || true

# Copy frontend source files
COPY frontend ./

# Build-time public config (Railway / Docker injects these as build args)
ARG VITE_API_URL
ARG VITE_PUBLIC_INVOICE_BASE_URL
ARG VITE_PUBLIC_DIET_PLAN_BASE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_INVOICE_BASE_URL=$VITE_PUBLIC_INVOICE_BASE_URL
ENV VITE_PUBLIC_DIET_PLAN_BASE_URL=$VITE_PUBLIC_DIET_PLAN_BASE_URL

RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

# `serve` is a lightweight static server; `-s` enables SPA fallback
RUN npm install -g serve@14
COPY --from=build /app/frontend/dist ./dist

EXPOSE 4173

# Railway / container runtime injects PORT at runtime; serve binds 0.0.0.0 on it
CMD ["sh", "-c", "serve -s dist -l ${PORT:-4173}"]

