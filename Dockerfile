FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

# Copy only built files and production dependencies
COPY backend/package*.json ./backend/
COPY --from=build /app/backend/dist ./backend/dist

WORKDIR /app/backend
RUN npm ci --only=production

EXPOSE 3000

CMD ["node", "dist/app.js"]
