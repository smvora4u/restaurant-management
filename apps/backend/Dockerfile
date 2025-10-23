FROM node:20-alpine
WORKDIR /app

# Copy package.json and tsconfig.json
COPY package.json tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY ./src ./src

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --omit=dev

ENV PORT=4000
EXPOSE 4000
CMD ["npm", "start"]



