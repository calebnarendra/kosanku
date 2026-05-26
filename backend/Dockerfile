FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
