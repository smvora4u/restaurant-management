FROM node:20-alpine
WORKDIR /app

# Copy package.json
COPY package.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY ./src ./src

# Build the application
RUN npm run build

ENV PORT=4000
EXPOSE 4000
CMD ["npm", "start"]



