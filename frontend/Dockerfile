FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE
ARG VITE_GRAFANA_BASE
ARG VITE_PROMETHEUS_BASE
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_GRAFANA_BASE=$VITE_GRAFANA_BASE
ENV VITE_PROMETHEUS_BASE=$VITE_PROMETHEUS_BASE
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
# Single-page app: serve index.html for all routes
RUN printf 'server {\n  listen 3000;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
