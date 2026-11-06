# Project-local PostgreSQL (dev/prod). Runtime config comes from docker-compose (POSTGRES_*).
FROM postgres:16-alpine

LABEL org.opencontainers.image.title="GV Fitness - Postgres"
LABEL org.opencontainers.image.description="PostgreSQL 16 for GV Fitness development and deployment"

# Automatically execute schema on container creation
COPY backend/schema.sql /docker-entrypoint-initdb.d/01-schema.sql

HEALTHCHECK --interval=5s --timeout=5s --start-period=10s --retries=5 \
  CMD pg_isready -U ${POSTGRES_USER:-gvfitness} -d ${POSTGRES_DB:-gvfitness_db} || exit 1

