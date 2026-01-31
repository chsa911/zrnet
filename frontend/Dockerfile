# Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
# Use npm ci if possible, otherwise fall back to npm install (lock mismatch)
RUN if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi

COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
