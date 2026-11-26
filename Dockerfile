# One image with the API, the background worker and the web client.
FROM node:24-bookworm-slim AS build
# pnpm comes from "packageManager" in package.json. The filtered install leaves other
# workspace packages out, so pnpm must not reinstall before it runs a script.
ENV CI=true \
	COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
	PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false
RUN corepack enable
WORKDIR /src

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/core-server/package.json apps/core-server/
COPY apps/core-worker/package.json apps/core-worker/
COPY apps/web/package.json apps/web/
COPY packages/api-contract/package.json packages/api-contract/
COPY packages/design-tokens/package.json packages/design-tokens/
RUN pnpm install --frozen-lockfile --filter "@waw/core-server..." --filter "@waw/web..."

COPY tsconfig.base.json ./
COPY apps/core-server apps/core-server
COPY apps/core-worker apps/core-worker
COPY apps/web apps/web
COPY packages/api-contract packages/api-contract
COPY packages/design-tokens packages/design-tokens
RUN pnpm --filter @waw/api-contract build \
	&& pnpm --filter @waw/core-worker build \
	&& pnpm --filter @waw/core-server build \
	&& pnpm --filter @waw/web build

# The server's production dependencies, installed where they run. pnpm links them, and the
# workspace packages, by relative paths inside this tree, so the tree is copied as a whole.
FROM node:24-bookworm-slim AS prod
ENV CI=true \
	COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
	PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false
RUN corepack enable
WORKDIR /opt/waw

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/core-server/package.json apps/core-server/
COPY apps/core-worker/package.json apps/core-worker/
COPY packages/api-contract/package.json packages/api-contract/
RUN pnpm install --prod --frozen-lockfile --filter "@waw/core-server..."

COPY --from=build /src/apps/core-server/dist apps/core-server/dist
COPY --from=build /src/apps/core-server/migrations apps/core-server/migrations
COPY --from=build /src/apps/core-worker/dist apps/core-worker/dist
COPY --from=build /src/packages/api-contract/dist packages/api-contract/dist
# The server serves the web client from here by default.
COPY --from=build /src/apps/web/dist apps/web/dist

FROM node:24-bookworm-slim
COPY --from=prod /opt/waw /opt/waw
# The compose file's "node dist/auth/token-cli.js" is relative to this directory.
WORKDIR /opt/waw/apps/core-server
ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --start-period=30s --retries=6 \
	CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/index.js"]
