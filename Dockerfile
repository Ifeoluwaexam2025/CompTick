FROM node:26-bookworm-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations

ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
