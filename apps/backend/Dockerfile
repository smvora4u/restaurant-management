# Backend-only Dockerfile - use when context is apps/backend
# Render with Root Directory = apps/backend: use this Dockerfile
# Printer proxy download will return 500 (bundle not in image)
FROM node:20-alpine
WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY ./src ./src
RUN npm run build

RUN npm prune --omit=dev

ENV PORT=4000
EXPOSE 4000
CMD ["npm", "start"]
