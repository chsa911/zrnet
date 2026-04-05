FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi

COPY . .

RUN python3 -m pip install --no-cache-dir numpy opencv-python-headless

ENV PORT=4000
ENV PYTHON_BIN=python3

EXPOSE 4000
CMD ["node", "server.js"]