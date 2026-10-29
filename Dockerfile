# Frontend: build React with Node, then serve the static files with Nginx

# ---- Stage 1: build ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Empty by default, so the app calls "/api" and Nginx proxies it to the backend.
# Override with --build-arg VITE_API_URL=... only if the backend is on another domain.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
