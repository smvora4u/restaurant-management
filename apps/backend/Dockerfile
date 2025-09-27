FROM node:20-alpine
WORKDIR /app

# Install only backend deps
COPY package.json ../../package.json /tmp/monorepo/
COPY ../../package-lock.json /tmp/monorepo/package-lock.json
WORKDIR /tmp/monorepo
RUN npm ci --omit=dev --workspaces=false || true

WORKDIR /app
COPY package.json ./package.json
COPY ./src ./src

RUN npm i --omit=dev

ENV PORT=4000
EXPOSE 4000
CMD ["node", "src/index.js"]



