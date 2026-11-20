# ============================================================
# Frontend Dockerfile — Next.js 16 (Turbopack)
#
# Build context for this one should be the `frontend/` folder itself
# (not the repo root), since Next.js projects are self-contained.
#
# IMPORTANT about NEXT_PUBLIC_API_URL:
# `src/lib/api.ts` reads `process.env.NEXT_PUBLIC_API_URL` to know where
# the backend lives. Next.js inlines any `NEXT_PUBLIC_*` var into the
# JavaScript bundle AT BUILD TIME — it is baked into the static files, not
# read again at container start. That also means it must be a URL the
# USER'S BROWSER can reach, not an internal Docker network hostname like
# `http://backend:8000` (the browser running on the visitor's laptop has
# no idea what "backend" means inside your docker-compose network).
#
# So pass it as a build ARG pointing at your server's real, publicly
# reachable address, e.g.:
#   http://your-server-ip:8000
#   https://api.yourdomain.com        (if you put a reverse proxy in front)
# ============================================================

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Baked into the client bundle at build time — see note above.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Next.js standalone output keeps the final image small — only the files
# actually needed at runtime, no full node_modules copy. Works as long as
# next.config.ts has `output: "standalone"` (add it if it isn't there yet).
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
