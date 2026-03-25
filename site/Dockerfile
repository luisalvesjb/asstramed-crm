FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY assets ./assets
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
