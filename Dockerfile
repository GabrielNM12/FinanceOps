# syntax=docker/dockerfile:1

# Build em três estágios para a imagem final não carregar toolchain nem código
# fonte — só o servidor compilado, o client do Prisma e o runtime do Node.

# --- 1. Dependências --------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# O Prisma no Alpine precisa do OpenSSL; sem isto o engine não carrega e o erro
# que aparece fala de "libssl", não de Prisma.
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci

# --- 2. Build ---------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# O `prisma generate` roda aqui e o client vai junto para a imagem final.
# DATABASE_URL é exigido pelo schema mesmo em build; o valor real vem do compose
# em tempo de execução.
ENV DATABASE_URL="file:/dados/financeops.db"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

# --- 3. Runtime -------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuário sem privilégio. O volume do banco é montado com este dono.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# `output: standalone` empacota só o necessário: node_modules vira um subset e
# a imagem cai de ~1,2 GB para ~200 MB.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Necessários em runtime: o schema para o `db push` da subida, o seed, e o
# client gerado (o standalone não traz o engine sozinho).
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/docker/entrypoint.sh ./entrypoint.sh

RUN mkdir -p /dados && chown -R nextjs:nodejs /dados
VOLUME ["/dados"]

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]
CMD ["node", "server.js"]
