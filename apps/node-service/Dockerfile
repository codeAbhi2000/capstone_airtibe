FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/node-service/package.json ./apps/node-service/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@draftly/node-service
RUN npm exec --workspace=@draftly/node-service prisma generate

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/node-service/dist ./apps/node-service/dist
COPY --from=builder /app/apps/node-service/package.json ./apps/node-service/
COPY --from=builder /app/apps/node-service/prisma ./apps/node-service/prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace=@draftly/node-service"]
