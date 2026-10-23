# Kort: web app + import API in one image.
# Build from the repository root:  docker compose -f deploy/docker-compose.yml build

# ---- stage 1: build the web app ----
FROM node:22-bookworm-slim AS web
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/mobile/package.json apps/mobile/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN npm ci --no-audit --no-fund
COPY . .
ENV NODE_ENV=production
RUN npm run build:web

# ---- stage 2: the server ----
FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 curl ca-certificates \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev --workspace apps/server --workspace packages/shared --no-audit --no-fund
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY --from=web /repo/apps/server/public ./apps/server/public

WORKDIR /repo/apps/server
ENV NODE_ENV=production PORT=8787 TMP_DIR=/tmp/kort WEB_DIR=/repo/apps/server/public
EXPOSE 8787
CMD ["npx", "tsx", "src/index.ts"]
