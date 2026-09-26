FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY lib ./lib
COPY public ./public
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:${PORT:-3000}/api/health || exit 1
USER node
EXPOSE 3000
CMD ["node", "server.js"]
