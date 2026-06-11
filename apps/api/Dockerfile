FROM node:22-alpine AS base

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# ---- builder ----
FROM base AS builder
WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- runner ----
FROM base AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev --silent

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 5050
CMD ["node", "dist/main"]
