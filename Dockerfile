# EreK — Next.js app (Ollama/n8n run separately or via docker-compose)
FROM node:20-alpine AS base

WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy app
COPY . .
RUN npm run build

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "start"]
