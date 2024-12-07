FROM node:22-alpine

RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "-g", "--"]

RUN mkdir -p /app/node_modules/ && chown -R node:node /app

USER node

WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node tsconfig.json ./src ./
ENV NODE_ENV=production
CMD ["npx", "tsx", "main.ts"]

EXPOSE 8080