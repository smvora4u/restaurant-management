FROM node:20-alpine
WORKDIR /app

COPY package.json ./package.json
COPY vite.config.ts ./vite.config.ts
COPY index.html ./index.html
COPY ./src ./src

RUN npm i --omit=dev && npm run build || true

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]



