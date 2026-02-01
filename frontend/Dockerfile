# Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
# Prefer npm ci, fallback to npm install when lockfile is out of sync
RUN if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi

COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
