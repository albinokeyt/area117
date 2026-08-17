# ==========================================
# EFI DATA OIL - Production Dockerfile
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Install required system packages for Prisma and Next.js on Alpine
RUN apk add --no-cache libc6-compat openssl

# 1. Install dependencies
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install

# 2. Copy source code
COPY . .

# 3. Generate Prisma client & Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# 4. Production Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["npm", "start"]
