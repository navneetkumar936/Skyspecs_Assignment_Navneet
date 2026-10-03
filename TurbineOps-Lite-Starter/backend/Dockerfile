FROM node:20-slim
# Prisma's engine needs openssl
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npm run prisma:generate

COPY . .
EXPOSE 4000

# apply migrations, seed (idempotent), then start
CMD ["sh", "-c", "until npm run prisma:migrate && npm run prisma:deploy; do echo 'waiting for db'; sleep 2; done && npm run seed && npx tsx src/index.ts"]