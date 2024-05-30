FROM node:22-alpine

RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "-g", "--"]

USER node

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY --chown=node:node tsconfig.json ./src ./ 
