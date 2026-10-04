# syntax=docker/dockerfile:1
FROM dhi.io/node:24-alpine3.23-dev AS deps

WORKDIR /app

COPY package.json package-lock.json ./

# Instalacja zależności z lockfile'em i trwałą pamięcią podręczną npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

FROM dhi.io/node:24-alpine3.23-dev AS builder

# Set working directory
WORKDIR /app

# Copy project deps from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source code
COPY . .

ENV NODE_ENV=production

RUN npm run build

FROM dhi.io/node:24-alpine3.23 AS runner

# Set working directory
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Dane testowe, które są potrzebne do działania aplikacji. 
# W praktyce, w środowisku produkcyjnym, dane te powinny być 
# przechowywane w bazie danych lub dostarczane przez API.
COPY ./data/flights.json ./data/flights.json

USER node

# Expose port 3000 to allow HTTP traffic
EXPOSE 3000

CMD ["node", "server.js"]