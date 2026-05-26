FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./
RUN npm ci --no-audit --no-fund

COPY . .

ENV HOST=0.0.0.0
ENV PORT=3000
ENV WDS_SOCKET_PORT=0

EXPOSE 3000

CMD ["npm", "start"]
