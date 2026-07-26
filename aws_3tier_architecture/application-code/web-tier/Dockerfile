# ---- Stage 1: Build the React app ----
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Disable ESLint plugin during build — works around a known version-mismatch
# bug in eslint-config-react-app's Jest override config, unrelated to our app code
ENV DISABLE_ESLINT_PLUGIN=true

RUN npm run build

# ---- Stage 2: Serve the built app via Nginx ----
# ---- Stage 2: Serve the built app via Nginx ----
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/* && rm -f /etc/nginx/conf.d/default.conf

COPY --from=build /app/build /usr/share/nginx/html

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]