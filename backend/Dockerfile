FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
# Prefer npm ci, fallback to npm install if lock mismatch
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi

COPY . .
ENV PORT=4000
EXPOSE 4000
CMD ["node", "server.js"]
